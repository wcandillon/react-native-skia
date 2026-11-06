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

#include <cmath>
#include <memory>

#import "RNSkManager.h"
#import "RNSkView.h"
#import "RNSkWindowSurface.h"
#import "RNSkiaModule.h"
#include "rnsurface/FrameScheduler.h"

using namespace facebook::react;

@interface SkiaView ()
// What the frame scheduler asks of the view (see SkiaViewPresentHost).
- (void)postFrameCallback;
- (int)presentFrame;
@end

namespace {

// What the scheduler asks of the view (see rnsurface::FrameScheduler), on
// the thread the view presents on: the display link for the vsync, the
// native view for the present.
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
  // Whether the window can show a frame (see appIsBackgrounded). Main thread.
  bool _canPresent;
  // Decides when the queued recordings are presented (see scheduleFrame:),
  // on the thread the view presents on. The host outlives the scheduler,
  // which refers to it (see dealloc).
  std::unique_ptr<SkiaViewPresentHost> _presentHost;
  std::unique_ptr<rnsurface::FrameScheduler> _scheduler;
#if !TARGET_OS_OSX
  CADisplayLink *_displayLink;
  // Whether the display link asked for the display's full rate yet (see
  // requestFullFrameRate).
  bool _fullFrameRateRequested;
#else
  bool _presentAgainScheduled;
#endif
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _manager = [RNSkiaModule latestActiveSkManager];
    _nativeId = 0;
    _highBitDepth = false;
    _canPresent = !appIsBackgrounded();
    _presentHost = std::make_unique<SkiaViewPresentHost>();
    _presentHost->view = self;
    _scheduler = std::make_unique<rnsurface::FrameScheduler>(*_presentHost);
    // A CAMetalLayer shows each frame presented in turn.
    _scheduler->setWindow(rnsurface::FrameScheduler::Window::kShowsEachFrame);
#if TARGET_OS_OSX
    _presentAgainScheduled = false;
#else
    _fullFrameRateRequested = false;
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
    // A view put back gets its last frame onto the new layer now: the layout
    // comes after the Core Animation commit that carries the layer, which
    // would show it empty for a frame or two.
    if (_view != nullptr) {
      [CATransaction begin];
      [CATransaction setDisableActions:YES];
      _layer.frame =
          CGRectMake(0, 0, self.bounds.size.width, self.bounds.size.height);
      [self attachSurface];
      [CATransaction commit];
      if (!_surface->showsFrame()) {
        _view->redraw();
      }
    }
  }
  if (_view != nullptr) {
    return;
  }
  auto context = manager->getPlatformContext();
  _surface = std::make_shared<RNSkia::RNSkWindowSurface>();
  _surface->setHighBitDepth(_highBitDepth);
  _surface->setUseP3ColorSpace(usesP3ColorSpace(_colorSpace, context));
  // The window belongs to the main thread, and is left alone while the app
  // is in the background: what the view holds is presented on its next frame
  // once the app is back (see appWillEnterForeground:).
  __weak SkiaView *weakSelf = self;
  _surface->setCanPresent([weakSelf]() {
    SkiaView *strongSelf = weakSelf;
    return strongSelf != nil && [[NSThread currentThread] isMainThread] &&
           strongSelf->_canPresent;
  });
  _view = std::make_shared<RNSkia::RNSkView>(context, _surface);
  if (_nativeId != 0) {
    manager->registerSkiaView(_nativeId, _view);
  }
  // A submitted recording goes to the scheduler, which arms the display
  // link, or presents on the spot for a window resized since the frame it
  // shows (see rnsurface::FrameScheduler::requestFrame).
  _view->setFrameScheduler([weakSelf](bool forResizedWindow) {
    [weakSelf scheduleFrame:forResizedWindow];
  });
}

- (void)removeFromSuperview {
  [self stopDisplayLink];
  if (_surface != nullptr) {
    _surface->detach();
  }
  [_layer removeFromSuperlayer];
  _layer = nil;
  [super removeFromSuperview];
}

- (void)dealloc {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
  [self stopDisplayLink];
  [self unregisterView];
  // The scheduler before the host it refers to.
  _scheduler = nullptr;
  _presentHost = nullptr;
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  [self stopDisplayLink];
  // Unregistered first, so that the native view is destroyed here rather than
  // under the registry's lock.
  [self unregisterView];
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
    _view->onCanPresent();
  }
}

#pragma mark - Frames

// A recording is waiting (see RNSkView::setFrameScheduler): the scheduler
// arms the display link for it, or presents it on the spot when it is for a
// window resized since the frame it shows.
- (void)scheduleFrame:(bool)forResizedWindow {
  // Without a window the frames wait: attaching one redraws them.
  if (_surface == nullptr || !_surface->isAttached()) {
    return;
  }
  _scheduler->requestFrame(forResizedWindow);
}

// The scheduler asks for the next vsync: the display link, started and
// unpaused here, paused again once the scheduler has nothing outstanding
// (see onFrame:), so that an idle view does not keep the display at its full
// rate. macOS has no CADisplayLink on the minimum deployment target, so the
// frame is presented a frame later there (see presentAgainLater).
- (void)postFrameCallback {
#if !TARGET_OS_OSX
  if (_displayLink == nil) {
    _displayLink = [CADisplayLink displayLinkWithTarget:self
                                               selector:@selector(onFrame:)];
    [_displayLink addToRunLoop:[NSRunLoop mainRunLoop]
                       forMode:NSRunLoopCommonModes];
  }
  [self requestFullFrameRate];
  _displayLink.paused = NO;
#else
  [self presentAgainLater];
#endif
}

// The scheduler presents: the queued recordings go to the window (see
// RNSkView::presentFrame).
- (int)presentFrame {
  if (_view == nullptr) {
    return rnsurface::FrameScheduler::kNothingPresented;
  }
  return _view->presentFrame();
}

#if !TARGET_OS_OSX
// A display link fires at 60 Hz until it asks for more, also while the
// display already runs at 120 Hz for another link (Reanimated asks for 120):
// a 120 Hz producer would then be presented every other frame. Ask for the
// display's full rate once the view knows its screen. On iPhone this needs
// CADisableMinimumFrameDurationOnPhone in the app's Info.plist too, else iOS
// caps every link at 60 Hz. The link is paused while nothing is queued, so an
// idle view does not keep the display at its full rate.
- (void)requestFullFrameRate {
#if !TARGET_OS_VISION
  if (_fullFrameRateRequested) {
    return;
  }
  UIScreen *screen = self.window.screen;
  if (screen == nil) {
    return;
  }
  _fullFrameRateRequested = true;
  const float maxFps = (float)screen.maximumFramesPerSecond;
  if (maxFps > 60) {
    _displayLink.preferredFrameRateRange =
        CAFrameRateRangeMake(60, maxFps, maxFps);
  }
#endif
}

- (void)onFrame:(CADisplayLink *)link {
  _scheduler->onFrame();
  // The scheduler asked for another tick while recordings are left: more
  // were submitted meanwhile, or the window could not take one.
  if (!_scheduler->isFrameCallbackPosted()) {
    link.paused = YES;
  }
}
#else
- (void)presentAgainLater {
  if (_presentAgainScheduled) {
    return;
  }
  _presentAgainScheduled = true;
  __weak SkiaView *weakSelf = self;
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, NSEC_PER_SEC / 60),
                 dispatch_get_main_queue(), ^{
                   SkiaView *strongSelf = weakSelf;
                   if (strongSelf == nil) {
                     return;
                   }
                   strongSelf->_presentAgainScheduled = false;
                   strongSelf->_scheduler->onFrame();
                 });
}
#endif

- (void)stopDisplayLink {
  // Whatever the scheduler asked for went with the link.
  _scheduler->cancel();
#if !TARGET_OS_OSX
  [_displayLink invalidate];
  _displayLink = nil;
  // The request belonged to that link: the next one (a recycled view mounting
  // again) must ask for the full rate too, or it stays at 60 Hz.
  _fullFrameRateRequested = false;
#endif
}

#pragma mark - Render

- (void)drawRect:(CGRect)rect {
  // The OS asked for a draw: present what the view holds right away.
  if (_view != nullptr) {
    _view->redraw();
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
    [self attachSurface];
    [CATransaction commit];
  }
}

// Configures the layer as the Dawn surface of the view at its current size:
// on every layout, and again when the bit depth changes so that the layer's
// pixel format follows.
- (void)attachSurface {
  auto context = _view->getPlatformContext();
  // The layout is on the pixel grid: round rather than truncate, so that a
  // product like 1169.9999 gives the pixel size the layout means.
  float pd = context->getPixelDensity();
  int w = static_cast<int>(std::lround(_layer.frame.size.width * pd));
  int h = static_cast<int>(std::lround(_layer.frame.size.height * pd));
  _surface->setLayoutSize(w, h);
  if (w == 0 || h == 0) {
    // Dawn refuses an empty surface: without one the frames wait for a size.
    _surface->detach();
    return;
  }
  // The layer is owned by the view: nothing to release with the window.
  _surface->attach((__bridge void *)_layer, w, h, _highBitDepth,
                   usesP3ColorSpace(_colorSpace, context), nullptr);
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
  if (_surface->isAttached()) {
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
  if (_surface->isAttached()) {
    [self attachSurface];
  }
}

@end

Class<RCTComponentViewProtocol> SkiaViewCls(void) { return SkiaView.class; }
