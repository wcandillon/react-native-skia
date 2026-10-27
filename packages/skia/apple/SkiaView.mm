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

@implementation SkiaView {
  // The native view, the window surface and the layer it presents into. All
  // three exist while the view is in the hierarchy (see willMoveToSuperview:).
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
  // Whether the window can show a frame (see appIsBackgrounded). Main thread.
  bool _canPresent;
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

// The native view lives while the view is in the hierarchy: it is created
// when the view gets a superview and torn down when it leaves it, so that a
// view kept around by a transition does not keep a surface.
#if !TARGET_OS_OSX
- (void)willMoveToSuperview:(UIView *)newSuperView {
  [super willMoveToSuperview:newSuperView];
#else
- (void)viewWillMoveToSuperview:(NSView *)newSuperView {
  [super viewWillMoveToSuperview:newSuperView];
#endif // !TARGET_OS_OSX
  auto manager = _manager.lock();
  if (newSuperView == nullptr || _view != nullptr || manager == nullptr) {
    return;
  }
  auto context = manager->getPlatformContext();
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wunguarded-availability-new"
  _layer = [CAMetalLayer layer];
#pragma clang diagnostic pop
  _surface = std::make_shared<RNSkia::RNSkWindowSurface>();
  _surface->setHighBitDepth(_highBitDepth);
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
  [self.layer addSublayer:_layer];
  if (_nativeId != 0) {
    manager->setSkiaView(_nativeId, _view);
  }
  // The display link presents whatever is waiting on its next tick, a frame
  // for a resized window included: nothing shows before it anyway.
  _view->setFrameScheduler(
      [weakSelf](bool /* forResizedWindow */) { [weakSelf scheduleFrame]; });
}

- (void)removeFromSuperview {
  [self stopDisplayLink];
  if (_view != nullptr) {
    [_layer removeFromSuperlayer];
    auto manager = _manager.lock();
    if (_nativeId != 0 && manager != nullptr) {
      manager->setSkiaView(_nativeId, nullptr);
    }
    _view = nullptr;
    _surface = nullptr;
    _layer = nil;
  }
  [super removeFromSuperview];
}

- (void)dealloc {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
  [self stopDisplayLink];
  [self unregisterView];
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  [self stopDisplayLink];
  [self unregisterView];
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

- (void)unregisterView {
  auto manager = _manager.lock();
  if (manager != nullptr && _nativeId != 0) {
    manager->unregisterSkiaView(_nativeId);
  }
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

// Presents on the display link: armed when a recording is submitted, paused
// again once the queue is empty. macOS has no CADisplayLink on the minimum
// deployment target, so frames are presented as soon as the main thread gets
// to them there, and tried again a frame later while some are left (more were
// submitted meanwhile, or the window could not take one).
- (void)scheduleFrame {
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
  if (_view != nullptr &&
      (_view->presentFrame() & RNSkia::RNSkView::kMoreQueued)) {
    [self presentAgainLater];
  }
#endif
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
  if (_view == nullptr ||
      !(_view->presentFrame() & RNSkia::RNSkView::kMoreQueued)) {
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
                   [strongSelf scheduleFrame];
                 });
}
#endif

- (void)stopDisplayLink {
#if !TARGET_OS_OSX
  [_displayLink invalidate];
  _displayLink = nil;
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
  if (_surface != nullptr) {
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
                   context->prefersP3ColorSpace(), nullptr);
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

@end

Class<RCTComponentViewProtocol> SkiaViewCls(void) { return SkiaView.class; }
