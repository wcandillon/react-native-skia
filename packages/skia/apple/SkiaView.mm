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

#include <atomic>
#include <cmath>
#include <memory>

#import "RNSkManager.h"
#import "RNSkView.h"
#import "RNSkWindowSurface.h"
#import "RNSkiaModule.h"

using namespace facebook::react;

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

// The thread every canvas presents on, as on Android (see PresentThread.java):
// one for the process, started on first use and never stopped. A present
// replays the view's recordings on the GPU context, and the first replay of a
// draw waits for the pipelines it uses to compile (hundreds of milliseconds
// after a fresh install, when no cache has them yet): on the main thread that
// wait froze every animation of the app
// (https://github.com/wcandillon/react-native-skia/issues/4384). The thread
// has a run loop, which the display links of the views tick on, and runs the
// tasks posted to it in order: a view's display link is only touched here.
// CAMetalLayer takes drawables and presents from any thread, and the window
// surface keeps these presents apart from the main thread's attach and detach
// (see RNSkWindowSurface).
@interface RNSkPresentThread : NSObject
+ (void)post:(dispatch_block_t)task;
+ (NSRunLoop *)runLoop;
@end

@implementation RNSkPresentThread

static NSRunLoop *sPresentRunLoop = nil;

/** Starts the thread on first use. Any thread. */
static NSRunLoop *presentRunLoop() {
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    dispatch_semaphore_t started = dispatch_semaphore_create(0);
    NSThread *thread = [[NSThread alloc] initWithBlock:^{
      sPresentRunLoop = [NSRunLoop currentRunLoop];
      // A port keeps the run loop running with nothing else on it.
      [sPresentRunLoop addPort:[NSMachPort port] forMode:NSDefaultRunLoopMode];
      dispatch_semaphore_signal(started);
      while (true) {
        @autoreleasepool {
          CFRunLoopRunInMode(kCFRunLoopDefaultMode, 1.0e10, true);
        }
      }
    }];
    thread.name = @"RNSkia Present";
    // The priority of the main thread: a present is what the user waits for.
    thread.qualityOfService = NSQualityOfServiceUserInteractive;
    [thread start];
    dispatch_semaphore_wait(started, DISPATCH_TIME_FOREVER);
  });
  return sPresentRunLoop;
}

/** Runs a task on the present thread, after those posted before it. */
+ (void)post:(dispatch_block_t)task {
  CFRunLoopRef runLoop = [presentRunLoop() getCFRunLoop];
  CFRunLoopPerformBlock(runLoop, kCFRunLoopCommonModes, ^{
    @autoreleasepool {
      task();
    }
  });
  CFRunLoopWakeUp(runLoop);
}

/** The run loop of the present thread, for the views' display links. */
+ (NSRunLoop *)runLoop {
  return presentRunLoop();
}

@end

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
  // the main thread, read on the present thread.
  std::atomic<bool> _canPresent;
  // Main thread: whether the window is attached, and at which size in pixels.
  // A new size is handed over with resize(), which never waits for the
  // present thread, rather than by attaching the window again.
  bool _windowAttached;
  int _attachedWidth;
  int _attachedHeight;
  // The view the present thread presents, while the view is in a superview:
  // set and cleared there, by tasks posted in order with those that present
  // (see enterPresentThread and leavePresentThread).
  std::shared_ptr<RNSkia::RNSkView> _presentView;
#if !TARGET_OS_OSX
  // Present thread.
  CADisplayLink *_displayLink;
  // Whether the display link asked for the display's full rate yet (see
  // requestFullFrameRate). Present thread.
  bool _fullFrameRateRequested;
  // The display's rate, read on the main thread as the view enters a window
  // (UIKit), 0 until then.
  std::atomic<float> _maximumFramesPerSecond;
#else
  // Present thread.
  bool _presentAgainScheduled;
#endif
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _manager = [RNSkiaModule latestActiveSkManager];
    _nativeId = 0;
    _highBitDepth = false;
    _canPresent = !appIsBackgrounded();
    _windowAttached = false;
    _attachedWidth = 0;
    _attachedHeight = 0;
#if TARGET_OS_OSX
    _presentAgainScheduled = false;
#else
    _fullFrameRateRequested = false;
    _maximumFramesPerSecond = 0;
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
    // the layer: attaching asks the present thread for a redraw, which shows
    // the last frame on it (a new layer shows none, see showsFrame).
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
  __weak SkiaView *weakSelf = self;
  _surface->setCanPresent([weakSelf]() {
    SkiaView *strongSelf = weakSelf;
    return strongSelf != nil && strongSelf->_canPresent.load();
  });
  _view = std::make_shared<RNSkia::RNSkView>(context, _surface);
  // Presents, redraws and frame requests go to the present thread, where
  // the view is the one the tasks posted before see.
  _view->setPresentThread([](std::function<void()> task) {
    auto shared = std::make_shared<std::function<void()>>(std::move(task));
    [RNSkPresentThread post:^{
      (*shared)();
    }];
  });
  [self enterPresentThread];
  // The display link presents whatever is waiting on its next tick, a frame
  // for a resized window included: nothing shows before it anyway. Called on
  // the present thread.
  _view->setFrameScheduler(
      [weakSelf](bool /* forResizedWindow */) { [weakSelf scheduleFrame]; });
  if (_nativeId != 0) {
    manager->registerSkiaView(_nativeId, _view);
  }
}

- (void)removeFromSuperview {
  [self stopDisplayLink];
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
  [RNSkPresentThread post:^{
    SkiaView *strongSelf = weakSelf;
    if (strongSelf != nil) {
      strongSelf->_presentView = view;
    }
  }];
}

// Main thread, as the view leaves its superview or is recycled: the present
// thread stops presenting the view, and lets go of the window, after the
// present in flight if any, so that the main thread does not wait for it.
// Only this layer's window: the view may be back with a new one by then. The
// task holds the layer, which so outlives the Dawn surface over it, and whose
// address cannot come back as the new layer's meanwhile.
- (void)leavePresentThread {
  if (_surface == nullptr) {
    return;
  }
  auto surface = _surface;
  CAMetalLayer *layer = _layer;
  SkiaView *strongSelf = self;
  [RNSkPresentThread post:^{
    strongSelf->_presentView = nullptr;
    surface->detach((__bridge void *)layer);
  }];
  _windowAttached = false;
}

// The display link holds the view: once it goes, its link was invalidated
// (see stopDisplayLink).
- (void)dealloc {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
  [self unregisterView];
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  [self stopDisplayLink];
  // Unregistered first, so that the native view is not destroyed under the
  // registry's lock: it goes as the present thread lets go of it.
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
  _canPresent = false;
}

// The app is coming back: what waited is presented on the view's next frame.
- (void)appWillEnterForeground:(NSNotification *)notification {
  _canPresent = true;
  if (_view != nullptr) {
    auto view = _view;
    [RNSkPresentThread post:^{
      view->onCanPresent();
    }];
  }
}

#pragma mark - Frames

// Presents on the display link, which ticks on the present thread: armed when
// a recording is submitted, paused again once the queue is empty. macOS has
// no CADisplayLink on the minimum deployment target, so frames are presented
// as soon as the present thread gets to them there, and tried again a frame
// later while some are left (more were submitted meanwhile, or the window
// could not take one). Present thread.
- (void)scheduleFrame {
  // Out of its superview the view has no window: the frames wait, and
  // attaching one redraws them. No link either, which would hold the view.
  if (_presentView == nullptr) {
    return;
  }
#if !TARGET_OS_OSX
  if (_displayLink == nil) {
    _displayLink = [CADisplayLink displayLinkWithTarget:self
                                               selector:@selector(onFrame:)];
    [_displayLink addToRunLoop:[RNSkPresentThread runLoop]
                       forMode:NSRunLoopCommonModes];
  }
  [self requestFullFrameRate];
  _displayLink.paused = NO;
#else
  if (_presentView != nullptr &&
      (_presentView->presentFrame() & RNSkia::RNSkView::kMoreQueued)) {
    [self presentAgainLater];
  }
#endif
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

- (void)onFrame:(CADisplayLink *)link {
  if (_presentView == nullptr ||
      !(_presentView->presentFrame() & RNSkia::RNSkView::kMoreQueued)) {
    link.paused = YES;
  }
}
#else
// Present thread.
- (void)presentAgainLater {
  if (_presentAgainScheduled) {
    return;
  }
  _presentAgainScheduled = true;
  __weak SkiaView *weakSelf = self;
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, NSEC_PER_SEC / 60),
                 dispatch_get_global_queue(QOS_CLASS_USER_INTERACTIVE, 0), ^{
                   [RNSkPresentThread post:^{
                     SkiaView *strongSelf = weakSelf;
                     if (strongSelf == nil) {
                       return;
                     }
                     strongSelf->_presentAgainScheduled = false;
                     [strongSelf scheduleFrame];
                   }];
                 });
}
#endif

// Main thread. The link goes on the present thread, which owns it; a new one
// asks for the display's rate again.
- (void)stopDisplayLink {
#if !TARGET_OS_OSX
  SkiaView *strongSelf = self;
  [RNSkPresentThread post:^{
    [strongSelf->_displayLink invalidate];
    strongSelf->_displayLink = nil;
    // The request belonged to that link: the next one must ask again.
    strongSelf->_fullFrameRateRequested = false;
  }];
#endif
}

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
// configures the swapchain for by its next present. Attaching again would
// wait for a present in flight, which may be waiting for its pipelines to
// compile, on the main thread.
- (void)updateWindowSize {
  int w = 0;
  int h = 0;
  [self pixelWidth:&w height:&h];
  _surface->setLayoutSize(w, h);
  if (w == 0 || h == 0) {
    // Dawn refuses an empty surface: without one the frames wait for a size.
    if (_windowAttached) {
      _surface->detach();
      _windowAttached = false;
    }
    return;
  }
  if (!_windowAttached) {
    [self attachSurface];
    return;
  }
  if (w != _attachedWidth || h != _attachedHeight) {
    _attachedWidth = w;
    _attachedHeight = h;
    _surface->resize(w, h);
  }
}

// Configures the layer as the Dawn surface of the view at its current size:
// as it first gets a size, and again when the bit depth or the color space
// changes so that the layer's pixel format follows.
- (void)attachSurface {
  int w = 0;
  int h = 0;
  [self pixelWidth:&w height:&h];
  _surface->setLayoutSize(w, h);
  if (w == 0 || h == 0) {
    _surface->detach();
    _windowAttached = false;
    return;
  }
  // The layer is owned by the view: nothing to release with the window.
  _surface->attach((__bridge void *)_layer, w, h, _highBitDepth,
                   usesP3ColorSpace(_colorSpace, _view->getPlatformContext()),
                   nullptr);
  _windowAttached = true;
  _attachedWidth = w;
  _attachedHeight = h;
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
