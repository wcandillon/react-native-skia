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

#include <memory>

#import "RNSkManager.h"
#import "RNSkMetalCanvasProvider.h"
#import "RNSkView.h"
#import "RNSkiaModule.h"

using namespace facebook::react;

@implementation SkiaView {
  // The native view and the layer it presents into. Both exist while the
  // view is in the hierarchy (see willMoveToSuperview:).
  std::shared_ptr<RNSkia::RNSkView> _view;
  std::shared_ptr<RNSkMetalCanvasProvider> _provider;
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
  _provider = std::make_shared<RNSkMetalCanvasProvider>(context);
  _view = std::make_shared<RNSkia::RNSkView>(context, _provider);
  [self.layer addSublayer:_provider->getLayer()];
  if (_nativeId != 0) {
    _manager->setSkiaView(_nativeId, _view);
  }
  _provider->setHighBitDepth(_highBitDepth);
  __weak SkiaView *weakSelf = self;
  _view->setFrameScheduler([weakSelf]() { [weakSelf scheduleFrame]; });
}

- (void)removeFromSuperview {
  [self stopDisplayLink];
  if (_view != nullptr) {
    [_provider->getLayer() removeFromSuperlayer];
    if (_nativeId != 0 && _manager != nullptr) {
      _manager->setSkiaView(_nativeId, nullptr);
    }
    _view = nullptr;
    _provider = nullptr;
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

#pragma mark - Layout

- (void)layoutSubviews {
  [super layoutSubviews];
  if (_provider != nullptr) {
    [CATransaction begin];
    [CATransaction setDisableActions:YES];
    _provider->setSize(self.bounds.size.width, self.bounds.size.height);
    [CATransaction commit];
  }
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
  _highBitDepth = highBitDepth;
  if (_provider != nullptr) {
    _provider->setHighBitDepth(highBitDepth);
  }
}

@end

Class<RCTComponentViewProtocol> SkiaViewCls(void) { return SkiaView.class; }
