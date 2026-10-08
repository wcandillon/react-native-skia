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

// Whether rendering must be skipped: drawing while the app is in the
// background can clear the CAMetalLayer, leaving the canvas empty when the app
// comes back (https://github.com/Shopify/react-native-skia/issues/1257). The
// application state is main-thread only, so this is answered there only.
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
  // Owned by the module, which outlives its views (see finalizeUpdates:).
  RNSkia::RNSkManager *_manager;
  size_t _nativeId;
  bool _highBitDepth;
#if !TARGET_OS_OSX
  CADisplayLink *_displayLink;
#endif
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _manager = [RNSkiaModule latestActiveSkManager].get();
    _nativeId = 0;
    _highBitDepth = false;
    static const auto defaultProps = std::make_shared<const SkiaViewProps>();
    _props = defaultProps;
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
  if (newSuperView == nullptr || _view != nullptr || _manager == nullptr) {
    return;
  }
  auto context = _manager->getPlatformContext();
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wunguarded-availability-new"
  _layer = [CAMetalLayer layer];
#pragma clang diagnostic pop
  _surface = std::make_shared<RNSkia::RNSkWindowSurface>();
  // The window belongs to the main thread, and is left alone while the app
  // is in the background (the frame is requeued and presented on return).
  _surface->setCanPresent([]() {
    return [[NSThread currentThread] isMainThread] && !appIsBackgrounded();
  });
  _view = std::make_shared<RNSkia::RNSkView>(context, _surface);
  [self.layer addSublayer:_layer];
  if (_nativeId != 0) {
    _manager->setSkiaView(_nativeId, _view);
  }
  __weak SkiaView *weakSelf = self;
  _view->setFrameScheduler([weakSelf]() { [weakSelf scheduleFrame]; });
}

- (void)removeFromSuperview {
  [self stopDisplayLink];
  if (_view != nullptr) {
    [_layer removeFromSuperlayer];
    if (_nativeId != 0 && _manager != nullptr) {
      _manager->setSkiaView(_nativeId, nullptr);
    }
    _view = nullptr;
    _surface = nullptr;
    _layer = nil;
  }
  [super removeFromSuperview];
}

- (void)dealloc {
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
    _manager = [RNSkiaModule latestActiveSkManager].get();
  }
}

- (void)unregisterView {
  if (_manager != nullptr && _nativeId != 0) {
    _manager->unregisterSkiaView(_nativeId);
  }
}

#pragma mark - Frames

// Presents on the display link: armed when a recording is submitted, paused
// again once the queue is empty. macOS has no CADisplayLink on the minimum
// deployment target, so frames are presented as soon as the main thread gets
// to them there.
- (void)scheduleFrame {
#if !TARGET_OS_OSX
  if (_displayLink == nil) {
    _displayLink = [CADisplayLink displayLinkWithTarget:self
                                               selector:@selector(onFrame:)];
    [_displayLink addToRunLoop:[NSRunLoop mainRunLoop]
                       forMode:NSRunLoopCommonModes];
  }
  _displayLink.paused = NO;
#else
  if (_view != nullptr) {
    _view->presentFrame();
  }
#endif
}

#if !TARGET_OS_OSX
- (void)onFrame:(CADisplayLink *)link {
  if (_view == nullptr || !_view->presentFrame()) {
    link.paused = YES;
  }
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

#if !TARGET_OS_OSX
- (void)didMoveToWindow {
  [super didMoveToWindow];
  // A frame presented while the view was out of its window (an inactive tab,
  // a screen under another one) is not what the layer shows once the view is
  // back: it keeps the last frame presented while it was on screen, until
  // something else invalidates it. Present the current frame again as soon
  // as the view is in a window. It can land a frame after the view appears:
  // the swapchain presents the drawable from the command buffer
  // (presentDrawable:), outside of the Core Animation transaction, so
  // presentsWithTransaction cannot put it in the same one.
  if (self.window != nil && _view != nullptr) {
    _view->presentCurrentFrame();
  }
}
#endif // !TARGET_OS_OSX

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
  // opaque, androidSurfaceType and androidZOrderOnTop select the backing view
  // on Android; a CAMetalLayer composites like any other layer.
}

// Not setNativeId:, which is the setter of RCTViewComponentView's nativeId
// (the string Fabric assigns from the nativeID prop).
- (void)bindNativeId:(size_t)nativeId {
  _nativeId = nativeId;
  if (_view != nullptr) {
    _manager->registerSkiaView(nativeId, _view);
  }
}

- (void)setHighBitDepth:(bool)highBitDepth {
  if (_highBitDepth == highBitDepth) {
    return;
  }
  _highBitDepth = highBitDepth;
  if (_surface != nullptr && _surface->isAttached()) {
    [self attachSurface];
  }
}

@end

Class<RCTComponentViewProtocol> SkiaViewCls(void) { return SkiaView.class; }
