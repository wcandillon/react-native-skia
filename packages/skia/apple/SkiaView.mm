#import "SkiaView.h"

#import <QuartzCore/CADisplayLink.h>
#import <QuartzCore/CATransaction.h>

#import <React/RCTConversions.h>
#import <React/RCTConvert.h>
#import <React/RCTFabricComponentsPlugins.h>

#import <react/renderer/components/rnskia/ComponentDescriptors.h>
#import <react/renderer/components/rnskia/EventEmitters.h>
#import <react/renderer/components/rnskia/Props.h>
#import <react/renderer/components/rnskia/RCTComponentViewHelpers.h>

#import <QuartzCore/CAMetalLayer.h>

#include <algorithm>
#include <atomic>
#include <cmath>
#include <memory>

#include "RNDawnUtils.h"
#include "RNMetalLayerColorSpace.h"
#import "RNSkManager.h"
#include "RNSkPresentThread.h"
#import "RNSkView.h"
#import "RNSkWindowSurface.h"
#import "RNSkiaModule.h"
#include "rnsurface/FrameScheduler.h"

using namespace facebook::react;

// React Native 0.82 added invalidate to RCTComponentViewProtocol; before that
// (the peer range starts at 0.79, react-native-macos is at 0.81) nothing
// declares or implements it. See -[SkiaView invalidate].
@interface RCTViewComponentView (SkiaInvalidate)
- (void)invalidate;
@end

@interface SkiaView ()
// What the frame scheduler asks of the view (see SkiaViewPresentHost).
- (void)postFrameCallback;
- (int)presentFrame;
@end

namespace {

// What the scheduler asks of the view (see rnsurface::FrameScheduler), on
// the present thread: the display link for the vsync, the native view for
// the present.
class SkiaViewPresentHost : public rnsurface::FrameScheduler::Host {
public:
  __weak SkiaView *view = nil;

  void postFrameCallback() override { [view postFrameCallback]; }

  int presentFrame() override { return [view presentFrame]; }
};

} // namespace

// Whether the window can show a frame: not while the app is in the background
// (hidden on macOS), where GPU work is refused and can leave the canvas empty
// when the app comes back
// (https://github.com/Shopify/react-native-skia/issues/1257). Read once when
// the view is created; the application's notifications keep it up to date
// from then on (see appDidEnterBackground:). The application state is
// main-thread only, so this is answered there only.
static bool appIsBackgrounded() {
#if !TARGET_OS_OSX
  auto state = UIApplication.sharedApplication.applicationState;
  return state == UIApplicationStateBackground;
#else
  return NSApplication.sharedApplication.isHidden;
#endif // !TARGET_OS_OSX
}

// The color space the colorSpace prop asks for: "srgb" or "display-p3",
// else (the prop is not set) the display's: Display P3 on a wide color gamut
// display, sRGB otherwise (see RNSkPlatformContext::prefersP3ColorSpace).
static bool
usesP3ColorSpace(const std::string &colorSpace,
                 const std::shared_ptr<RNSkia::RNSkPlatformContext> &context) {
  if (colorSpace == "srgb") {
    return false;
  }
  if (colorSpace == "display-p3") {
    return true;
  }
  return context->prefersP3ColorSpace();
}

@implementation SkiaView {
  // The native view and its window surface, from the view's first superview
  // until it is recycled, and the layer the surface presents into, while the
  // view is in a superview (see willMoveToSuperview:).
  std::shared_ptr<RNSkia::RNSkView> _view;
  std::shared_ptr<RNSkia::RNSkWindowSurface> _surface;
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wunguarded-availability-new"
  CAMetalLayer *_layer;
#pragma clang diagnostic pop
  // Owned by the module (see finalizeUpdates:). A view can outlive its
  // manager: on a reload the module is invalidated on the JS thread while
  // Fabric still holds the views of the old bundle, which it deallocates
  // afterwards on the main thread. The weak reference makes that late
  // unregistration a no-op, and a concurrent one keep the manager alive for
  // the duration of the call.
  std::weak_ptr<RNSkia::RNSkManager> _manager;
  size_t _nativeId;
  bool _highBitDepth;
  // The colorSpace prop, see usesP3ColorSpace.
  std::string _colorSpace;
  // Whether the window can show a frame (see appIsBackgrounded). Written on
  // the main thread, read on the present thread, by the surface, which holds
  // this rather than the view (see leavePresentThread).
  std::shared_ptr<std::atomic<bool>> _canPresent;
  // Whether the present thread presents the view: from the enter task to the
  // leave task. What a recording that reaches the present thread looks at
  // before it touches the view (see leavePresentThread). Present thread.
  std::shared_ptr<bool> _presenting;
  // The main thread's record of the window: whether one is attached (the
  // attach itself runs on the present thread, see attachSurface), and at
  // which size in pixels. A new size is handed over with resize(), which
  // never waits for the present thread, rather than by attaching again.
  bool _windowAttached;
  int _attachedWidth;
  int _attachedHeight;
  // The view the present thread presents, while the view is in a superview:
  // set and cleared there, by tasks posted in order with those that present
  // (see enterPresentThread and leavePresentThread).
  std::shared_ptr<RNSkia::RNSkView> _presentView;
  // Whether the window is attached, as the posted attach and detach left it
  // (see attachWindowWithWidth:height: and detachWindow): without one the
  // frames wait, and the display link stays paused. Present thread.
  bool _hasWindow;
  // Decides when the queued recordings are presented (see scheduleFrame:).
  // Made on the main thread, used on the present thread only. The host
  // outlives the scheduler, which refers to it (see dealloc).
  std::unique_ptr<SkiaViewPresentHost> _presentHost;
  std::unique_ptr<rnsurface::FrameScheduler> _scheduler;
#if !TARGET_OS_OSX
  // Present thread.
  CADisplayLink *_displayLink;
  // Whether the display link asked for the display's full rate yet (see
  // requestFullFrameRate). Present thread.
  bool _fullFrameRateRequested;
  // The display's rate, read on the main thread as the view enters a window
  // (UIKit), 0 until then.
  std::atomic<float> _maximumFramesPerSecond;
  // Whether a frame went to the window since the display link's last tick,
  // and when the interval of that tick ends (see scheduleFrame:). Present
  // thread.
  bool _presentedSinceTick;
  CFTimeInterval _tickTarget;
#else
  // Whether a tick is scheduled, when the last one ran (see
  // presentAgainLater), and which ticks are still wanted: the leave moves
  // the count on, and a tick scheduled before it does nothing. Present
  // thread.
  bool _presentAgainScheduled;
  CFTimeInterval _lastTick;
  uint64_t _tickGeneration;
#endif
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _manager = [RNSkiaModule latestActiveSkManager];
    _nativeId = 0;
    _highBitDepth = false;
    _canPresent = std::make_shared<std::atomic<bool>>(!appIsBackgrounded());
    _presenting = std::make_shared<bool>(false);
    _windowAttached = false;
    _attachedWidth = 0;
    _attachedHeight = 0;
    _hasWindow = false;
    _presentHost = std::make_unique<SkiaViewPresentHost>();
    _presentHost->view = self;
    _scheduler = std::make_unique<rnsurface::FrameScheduler>(*_presentHost);
    // A CAMetalLayer shows each frame presented in turn.
    _scheduler->setWindow(rnsurface::FrameScheduler::Window::kShowsEachFrame);
#if TARGET_OS_OSX
    _presentAgainScheduled = false;
    _lastTick = 0;
    _tickGeneration = 0;
#else
    _fullFrameRateRequested = false;
    _maximumFramesPerSecond = 0;
    _presentedSinceTick = false;
    _tickTarget = 0;
#endif
    static const auto defaultProps = std::make_shared<const SkiaViewProps>();
    _props = defaultProps;
    NSNotificationCenter *center = [NSNotificationCenter defaultCenter];
#if !TARGET_OS_OSX
    [center addObserver:self
               selector:@selector(appDidEnterBackground:)
                   name:UIApplicationDidEnterBackgroundNotification
                 object:nil];
    [center addObserver:self
               selector:@selector(appWillEnterForeground:)
                   name:UIApplicationWillEnterForegroundNotification
                 object:nil];
#else
    [center addObserver:self
               selector:@selector(appDidEnterBackground:)
                   name:NSApplicationDidHideNotification
                 object:nil];
    [center addObserver:self
               selector:@selector(appWillEnterForeground:)
                   name:NSApplicationDidUnhideNotification
                 object:nil];
#endif
  }
  return self;
}

#pragma mark - Lifecycle

// The native view is created when the view first gets a superview and lives
// until the view is recycled, as on Android: what it shows stays with it
// while the view is out of its superview, where a scroll view that clips its
// subviews keeps the rows scrolled away. The window goes then, the layer with
// its drawables included, so that a view out of the hierarchy holds none.
#if !TARGET_OS_OSX
- (void)willMoveToSuperview:(UIView *)newSuperView {
  [super willMoveToSuperview:newSuperView];
#else
- (void)viewWillMoveToSuperview:(NSView *)newSuperView {
  [super viewWillMoveToSuperview:newSuperView];
#endif // !TARGET_OS_OSX
  auto manager = _manager.lock();
  if (newSuperView == nullptr || manager == nullptr) {
    return;
  }
  if (_layer == nil) {
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wunguarded-availability-new"
    _layer = [CAMetalLayer layer];
#pragma clang diagnostic pop
    [self.layer addSublayer:_layer];
    // AppKit lays out a view put in a superview only when asked: the layout
    // attaches the window's surface to the layer (see layoutSubviews).
    [self setNeedsLayout];
    // A view put back gets its window onto the new layer now rather than on
    // the layout, which comes after the Core Animation commit that carries
    // the layer: the attach, on the present thread, ends with a redraw that
    // shows the last frame on it (a new layer shows none, see showsFrame).
    // On an idle present thread that redraw lands within a frame of the
    // commit (0.6 to 2.4 ms after it on an iPhone 14 Pro); behind another
    // view's first present, which waits for its pipelines to compile, the
    // layer shows nothing until the thread gets to it, rather than the main
    // thread waiting for the compile.
    if (_view != nullptr) {
      [self enterPresentThread];
      [CATransaction begin];
      [CATransaction setDisableActions:YES];
      _layer.frame =
          CGRectMake(0, 0, self.bounds.size.width, self.bounds.size.height);
      [self attachSurface];
      [CATransaction commit];
    }
  }
  if (_view != nullptr) {
    return;
  }
  auto context = manager->getPlatformContext();
  _surface = std::make_shared<RNSkia::RNSkWindowSurface>();
  _surface->setHighBitDepth(_highBitDepth);
  _surface->setUseP3ColorSpace(usesP3ColorSpace(_colorSpace, context));
  // The window is left alone while the app is in the background: what the
  // view holds is presented on its next frame once the app is back (see
  // appWillEnterForeground:). Dawn holds GPU work committed meanwhile anyway
  // (see DawnContext), so a present racing the notification is held there.
  _surface->setCanPresent(
      [canPresent = _canPresent]() { return canPresent->load(); });
  _view = std::make_shared<RNSkia::RNSkView>(context, _surface);
  // Presents, redraws and frame requests go to the present thread, where
  // the view is the one the tasks posted before see.
  _view->setPresentThread([](std::function<void()> task) {
    RNSkia::presentThread().post(std::move(task));
  });
  // The entries of the view and its window that belong to the present
  // thread are bound to it there (see RNSkView::bindPresentThread), ahead
  // of everything posted behind this.
  {
    auto surface = _surface;
    auto view = _view;
    RNSkia::presentThread().post([=]() {
      surface->bindPresentingThread();
      view->bindPresentThread();
    });
  }
  [self enterPresentThread];
  // A submitted recording goes to the scheduler, on the present thread,
  // which arms the display link, or presents on the spot for a window
  // resized since the frame it shows (see
  // rnsurface::FrameScheduler::requestFrame).
  __weak SkiaView *weakSelf = self;
  _view->setFrameScheduler(
      [weakSelf, presenting = _presenting](bool forResizedWindow) {
        if (*presenting) {
          [weakSelf scheduleFrame:forResizedWindow];
        }
      });
  if (_nativeId != 0) {
    manager->registerSkiaView(_nativeId, _view);
  }
}

- (void)removeFromSuperview {
  [self leavePresentThread];
  [_layer removeFromSuperlayer];
  _layer = nil;
  [super removeFromSuperview];
}

// Main thread, as the view gets a superview: the present thread presents the
// view from the tasks posted after this one on.
- (void)enterPresentThread {
  __weak SkiaView *weakSelf = self;
  auto view = _view;
  auto presenting = _presenting;
  RNSkia::presentThread().post([=]() {
    *presenting = true;
    SkiaView *strongSelf = weakSelf;
    if (strongSelf != nil) {
      strongSelf->_presentView = view;
    }
  });
}

// Main thread, as the view leaves its superview or is recycled: the present
// thread stops presenting the view, and lets go of the window, after the
// present in flight if any, so that the main thread does not wait for it.
// Only this layer's window: the view may be back with a new one by then. The
// task holds the layer, which so outlives the Dawn surface over it, and whose
// address cannot come back as the new layer's meanwhile. The display link
// goes in the same task: a frame scheduled between two would make a new one
// that outlives the leave (see scheduleFrame). The view goes on the main
// thread, where UIKit expects it to, as this task owns the last reference to
// it once Fabric let go of it (see invalidate). A strong capture cannot
// promise that: the block would let go on the present thread, racing the main
// thread for the last release. So the reference is taken here, by hand, and
// let go of only on the main thread, once the autorelease pool of the work is
// drained. Every task posted before this one runs under that reference, also
// where it loads a weak one. Nothing of the present thread loads one after
// this task (a recording from a stale RNSkView stops at _presenting), and the
// surface asks _canPresent rather than the view.
- (void)leavePresentThread {
  if (_surface == nullptr) {
    return;
  }
  auto surface = _surface;
  CAMetalLayer *layer = _layer;
  void *retainedSelf = (__bridge_retained void *)self;
  RNSkia::presentThread().post([=]() {
    @autoreleasepool {
      __unsafe_unretained SkiaView *view = (__bridge SkiaView *)retainedSelf;
      *view->_presenting = false;
      // Whatever the scheduler asked for goes with the link.
      view->_scheduler->cancel();
#if !TARGET_OS_OSX
      [view->_displayLink invalidate];
      view->_displayLink = nil;
      // The request belonged to that link: the next one must ask again.
      view->_fullFrameRateRequested = false;
      view->_presentedSinceTick = false;
#else
      // A tick scheduled is let go of (see presentAgainLater): the scheduler
      // forgot it, and the next request schedules one of its own.
      view->_presentAgainScheduled = false;
      view->_tickGeneration++;
#endif
      view->_presentView = nullptr;
      surface->detach((__bridge void *)layer);
      view->_hasWindow = false;
    }
    dispatch_async_f(dispatch_get_main_queue(), retainedSelf,
                     [](void *retained) { CFRelease(retained); });
  });
  _windowAttached = false;
}

// Main thread: the display link held the view until the leave task
// invalidated it, and that task handed the view back here (see
// leavePresentThread).
- (void)dealloc {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
  [self unregisterView];
  // The scheduler before the host it refers to; the present thread is done
  // with both (see leavePresentThread).
  _scheduler = nullptr;
  _presentHost = nullptr;
}

// Fabric either recycles an unmounted view (prepareForRecycle) or, with the
// pool full or the view opting out, lets go of it (invalidate): the native
// view and the window go now either way, rather than with the view.
- (void)prepareForRecycle {
  [super prepareForRecycle];
  [self releaseNativeView];
}

// Only called from React Native 0.82 on, which implements it on every view:
// on an earlier version nothing gets here. Drop the category above once the
// peer range starts at 0.82 and react-native-macos has caught up.
- (void)invalidate {
  [super invalidate];
  [self releaseNativeView];
}

// Unregistered first, so that the native view is not destroyed under the
// registry's lock: it goes as the present thread lets go of it.
- (void)releaseNativeView {
  [self unregisterView];
  [self leavePresentThread];
  [_layer removeFromSuperlayer];
  _view = nullptr;
  _surface = nullptr;
  _layer = nil;
}

- (void)finalizeUpdates:(RNComponentViewUpdateMask)updateMask {
  [super finalizeUpdates:updateMask];
  if (updateMask == RNComponentViewUpdateMaskAll) {
    // this flag is only set when the view is inserted and we want to set the
    // manager here since the view could be recycled or the app could be
    // refreshed and we would have a stale manager then
    _manager = [RNSkiaModule latestActiveSkManager];
  }
}

// Once: a recycled view takes its next id from its props, and a pooled one
// must not unregister an id another view may have since.
- (void)unregisterView {
  auto manager = _manager.lock();
  if (manager != nullptr && _nativeId != 0) {
    manager->unregisterSkiaView(_nativeId);
  }
  _nativeId = 0;
}

#pragma mark - Application state

// The app went to the background (was hidden on macOS): frames wait there.
- (void)appDidEnterBackground:(NSNotification *)notification {
  _canPresent->store(false);
}

// The app is coming back: what waited is presented on the view's next frame.
- (void)appWillEnterForeground:(NSNotification *)notification {
  _canPresent->store(true);
  if (_view != nullptr) {
    auto view = _view;
    RNSkia::presentThread().post([=]() { view->onCanPresent(); });
  }
}

#pragma mark - Frames

// A recording is waiting (see RNSkView::setFrameScheduler): the scheduler
// arms the display link for it, or presents it on the spot when it is for a
// window resized since the frame it shows. Present thread.
- (void)scheduleFrame:(bool)forResizedWindow {
  // Out of its superview, or at a size of zero, the view has no window: the
  // frames wait, and attaching one redraws them (see
  // RNSkWindowSurface::attach). A link would only tick for nothing, and out
  // of the superview hold the view.
  if (_presentView == nullptr || !_hasWindow) {
    return;
  }
#if !TARGET_OS_OSX
  // One present per vsync. A frame for a resized window goes on the spot
  // only while nothing went to the window since the display link's last
  // tick: a second present in the same interval shows no sooner (the
  // display takes one frame per vsync), and takes a second of the layer's
  // three drawables; once they are all in flight, the next present blocks
  // this thread until one comes back. The frame waits for the next tick
  // instead, like any other.
  if (forResizedWindow && _presentedSinceTick &&
      CACurrentMediaTime() < _tickTarget) {
    forResizedWindow = false;
  }
#endif
  _scheduler->requestFrame(forResizedWindow);
}

// The scheduler asks for the next vsync: the display link, which ticks on
// the present thread, started and unpaused here and paused again once the
// scheduler has nothing outstanding (see onFrame:), so that an idle view
// does not keep the display at its full rate. macOS has no CADisplayLink on
// the minimum deployment target, so the frame is presented a frame later
// there (see presentAgainLater). Present thread.
- (void)postFrameCallback {
#if !TARGET_OS_OSX
  if (_displayLink == nil) {
    _displayLink = [CADisplayLink displayLinkWithTarget:self
                                               selector:@selector(onFrame:)];
    [_displayLink addToRunLoop:[NSRunLoop currentRunLoop]
                       forMode:NSRunLoopCommonModes];
  }
  [self requestFullFrameRate];
  _displayLink.paused = NO;
#else
  [self presentAgainLater];
#endif
}

// The scheduler presents: the queued recordings go to the window (see
// RNSkView::presentFrame). Present thread.
- (int)presentFrame {
  if (_presentView == nullptr) {
    return rnsurface::FrameScheduler::kNothingPresented;
  }
  const int result = _presentView->presentFrame();
#if !TARGET_OS_OSX
  if ((result & rnsurface::FrameScheduler::kPresented) != 0) {
    _presentedSinceTick = true;
  }
#endif
  return result;
}

#if !TARGET_OS_OSX
// The display's rate, for the display link (see requestFullFrameRate): UIKit
// is only read on the main thread.
- (void)didMoveToWindow {
  [super didMoveToWindow];
#if !TARGET_OS_VISION
  UIScreen *screen = self.window.screen;
  if (screen != nil) {
    _maximumFramesPerSecond = (float)screen.maximumFramesPerSecond;
  }
#endif
}

// A display link fires at 60 Hz until it asks for more, also while the
// display already runs at 120 Hz for another link (Reanimated asks for 120):
// a 120 Hz producer would then be presented every other frame. Ask for the
// display's full rate once the view knows its screen. On iPhone this needs
// CADisableMinimumFrameDurationOnPhone in the app's Info.plist too, else iOS
// caps every link at 60 Hz. The link is paused while nothing is queued, so an
// idle view does not keep the display at its full rate. Present thread.
- (void)requestFullFrameRate {
#if !TARGET_OS_VISION
  if (_fullFrameRateRequested) {
    return;
  }
  const float maxFps = _maximumFramesPerSecond.load();
  if (maxFps <= 0) {
    return;
  }
  _fullFrameRateRequested = true;
  if (maxFps > 60) {
    _displayLink.preferredFrameRateRange =
        CAFrameRateRangeMake(60, maxFps, maxFps);
  }
#endif
}

// No autorelease pool of its own: the link is a run loop source, so the
// present thread's loop returns after each tick and drains its pool then
// (see rnsurface::RenderThread::loop).
- (void)onFrame:(CADisplayLink *)link {
  _presentedSinceTick = false;
  _tickTarget = link.targetTimestamp;
  _scheduler->onFrame();
  // The scheduler asked for another tick while recordings are left: more
  // were submitted meanwhile, or the window could not take one.
  if (!_scheduler->isFrameCallbackPosted()) {
    link.paused = YES;
  }
}
#else
// A tick stands in for the vsync macOS has no display link for on the
// minimum deployment target. The first tick after an idle stretch runs as
// soon as the present thread gets to it, as presenting did before the
// scheduler: nothing waits for a cadence that has not started. The ticks
// after it come at 60 Hz from the previous one, for the frames left over
// (the window could not take one) and the frames that keep coming. Present
// thread.
- (void)presentAgainLater {
  if (_presentAgainScheduled) {
    return;
  }
  _presentAgainScheduled = true;
  const CFTimeInterval interval = 1.0 / 60;
  const CFTimeInterval delay =
      std::max(0.0, _lastTick + interval - CACurrentMediaTime());
  const uint64_t generation = _tickGeneration;
  __weak SkiaView *weakSelf = self;
  auto presenting = _presenting;
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW,
                               static_cast<int64_t>(delay * NSEC_PER_SEC)),
                 dispatch_get_global_queue(QOS_CLASS_USER_INTERACTIVE, 0), ^{
                   RNSkia::presentThread().post([=]() {
                     if (!*presenting) {
                       return;
                     }
                     SkiaView *strongSelf = weakSelf;
                     if (strongSelf == nil ||
                         strongSelf->_tickGeneration != generation) {
                       // Left meanwhile (see leavePresentThread): the scheduler
                       // forgot what it asked for, and asks again for what
                       // comes next.
                       return;
                     }
                     strongSelf->_presentAgainScheduled = false;
                     strongSelf->_lastTick = CACurrentMediaTime();
                     strongSelf->_scheduler->onFrame();
                   });
                 });
}
#endif

#pragma mark - Render

- (void)drawRect:(CGRect)rect {
  // The OS asked for a draw: present what the view holds on the present
  // thread's next turn.
  if (_view != nullptr) {
    _view->requestRedraw();
  }
}

#pragma mark - Layout

- (void)layoutSubviews {
  [super layoutSubviews];
  if (_surface != nullptr && _layer != nil) {
    [CATransaction begin];
    [CATransaction setDisableActions:YES];
    _layer.frame =
        CGRectMake(0, 0, self.bounds.size.width, self.bounds.size.height);
    [self updateWindowSize];
    [CATransaction commit];
  }
}

// The size of the layer in pixels. The layout is on the pixel grid: round
// rather than truncate, so that a product like 1169.9999 gives the pixel size
// the layout means.
- (void)pixelWidth:(int *)width height:(int *)height {
  float pd = _view->getPlatformContext()->getPixelDensity();
  *width = static_cast<int>(std::lround(_layer.frame.size.width * pd));
  *height = static_cast<int>(std::lround(_layer.frame.size.height * pd));
}

// On every layout: the window is attached the first time it has a size, and
// handed a new size from then on with resize(), which the present thread
// configures the swapchain for by its next present. A size of zero takes the
// window away until the next size: Dawn refuses an empty surface, and without
// one the frames wait.
- (void)updateWindowSize {
  int w = 0;
  int h = 0;
  [self pixelWidth:&w height:&h];
  _surface->setLayoutSize(w, h);
  if (!_windowAttached || w == 0 || h == 0) {
    [self attachWindowWithWidth:w height:h];
    return;
  }
  if (w != _attachedWidth || h != _attachedHeight) {
    _attachedWidth = w;
    _attachedHeight = h;
    _surface->resize(w, h);
  }
}

// Configures the layer as the Dawn surface of the view, at the layer's size:
// as the view comes back into a superview with a new layer, and again when
// the bit depth or the color space changes so that the layer's pixel format
// follows (see attachWindowWithWidth:height:).
- (void)attachSurface {
  int w = 0;
  int h = 0;
  [self pixelWidth:&w height:&h];
  _surface->setLayoutSize(w, h);
  [self attachWindowWithWidth:w height:h];
}

// Attaches the window at the layout size just set, in pixels, or takes it
// away at a size of zero. The attach runs on the present thread, in order
// with the presents, detaches and redraws posted before it: a present in
// flight holds the thread for as long as its pipelines take to compile, and
// the main thread must not wait for that. It takes the layout size as it is
// when it runs, so that a layout in between is not lost (a resize() before the
// window exists is dropped), and does nothing at a size of zero (that layout
// posted a detach after it). A layout that handed resize() a size while the
// window was being attached was dropped too: the window takes the latest layout
// size once attached. The main thread records the window as attached right
// away, so that later layouts resize it.
- (void)attachWindowWithWidth:(int)w height:(int)h {
  if (w == 0 || h == 0) {
    [self detachWindow];
    return;
  }
  _windowAttached = true;
  _attachedWidth = w;
  _attachedHeight = h;
  __weak SkiaView *weakSelf = self;
  auto surface = _surface;
  CAMetalLayer *layer = _layer;
  const bool highBitDepth = _highBitDepth;
  const bool useP3ColorSpace =
      usesP3ColorSpace(_colorSpace, _view->getPlatformContext());
  // The layer is tagged with its colorspace here, on the main thread, whose
  // run loop commits it with the layer: the present thread configures the
  // surface without touching a CATransaction (#4474). For the format the
  // attach asks for, which a Metal surface grants (see
  // RNSkWindowSurface::attach).
  RNSkia::applyCAMetalLayerColorSpace(
      (__bridge void *)layer,
      highBitDepth ? RNSkia::DawnUtils::HighBitDepthTextureFormat
                   : RNSkia::DawnUtils::PreferredTextureFormat,
      useP3ColorSpace);
  RNSkia::presentThread().post([=]() {
    int width = 0;
    int height = 0;
    if (!surface->getLayoutSize(&width, &height) || width == 0 || height == 0) {
      return;
    }
    // The layer is owned by the view: nothing to release with the window.
    surface->attach((__bridge void *)layer, width, height, highBitDepth,
                    useP3ColorSpace, nullptr);
    int latestWidth = 0;
    int latestHeight = 0;
    if (surface->getLayoutSize(&latestWidth, &latestHeight) &&
        (latestWidth != width || latestHeight != height)) {
      surface->resize(latestWidth, latestHeight);
    }
    SkiaView *strongSelf = weakSelf;
    if (strongSelf != nil) {
      strongSelf->_hasWindow = surface->isAttached();
    }
  });
}

// Takes the window away on the present thread, after the present in flight:
// the layout collapsed to zero. Only this layer's window: an attach posted
// after this one, for another layer, stays (see RNSkWindowSurface::detach).
- (void)detachWindow {
  if (!_windowAttached) {
    return;
  }
  _windowAttached = false;
  __weak SkiaView *weakSelf = self;
  auto surface = _surface;
  CAMetalLayer *layer = _layer;
  RNSkia::presentThread().post([=]() {
    surface->detach((__bridge void *)layer);
    SkiaView *strongSelf = weakSelf;
    if (strongSelf != nil) {
      strongSelf->_hasWindow = surface->isAttached();
    }
  });
}

#pragma mark - Props

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<SkiaViewComponentDescriptor>();
}

- (void)updateProps:(const Props::Shared &)props
           oldProps:(const Props::Shared &)oldProps {
  const auto &newProps = *std::static_pointer_cast<const SkiaViewProps>(props);
  [super updateProps:props oldProps:oldProps];
  int nativeId =
      [[RCTConvert NSString:RCTNSStringFromString(newProps.nativeId)] intValue];
  [self bindNativeId:nativeId];
  [self setHighBitDepth:newProps.highBitDepth];
  [self setColorSpace:newProps.colorSpace];
  // The android* props (backing view, opacity, z-order) select and set up the
  // backing view on Android; a CAMetalLayer composites like any other layer.
}

// Not setNativeId:, which is the setter of RCTViewComponentView's nativeId
// (the string Fabric assigns from the nativeID prop).
- (void)bindNativeId:(size_t)nativeId {
  _nativeId = nativeId;
  auto manager = _manager.lock();
  if (_view != nullptr && manager != nullptr) {
    manager->registerSkiaView(nativeId, _view);
  }
}

- (void)setHighBitDepth:(bool)highBitDepth {
  if (_highBitDepth == highBitDepth) {
    return;
  }
  _highBitDepth = highBitDepth;
  if (_surface == nullptr) {
    return;
  }
  // The layer is re-attached with the new format; until then (or without a
  // size), frames are recorded for it.
  _surface->setHighBitDepth(highBitDepth);
  if (_windowAttached) {
    [self attachSurface];
  }
}

- (void)setColorSpace:(const std::string &)colorSpace {
  if (_colorSpace == colorSpace) {
    return;
  }
  _colorSpace = colorSpace;
  if (_surface == nullptr) {
    return;
  }
  // Like the bit depth: the layer is re-attached in the new color space;
  // until then, frames are recorded for it.
  _surface->setUseP3ColorSpace(
      usesP3ColorSpace(_colorSpace, _view->getPlatformContext()));
  if (_windowAttached) {
    [self attachSurface];
  }
}

@end

Class<RCTComponentViewProtocol> SkiaViewCls(void) { return SkiaView.class; }
