#import "SkiaImageView.h"

#import <QuartzCore/CATransaction.h>

#import <React/RCTFabricComponentsPlugins.h>

#import <react/renderer/components/rnskia/ComponentDescriptors.h>
#import <react/renderer/components/rnskia/EventEmitters.h>
#import <react/renderer/components/rnskia/Props.h>
#import <react/renderer/components/rnskia/RCTComponentViewHelpers.h>

#import "SkiaPresentedImageLayer.h"

using namespace facebook::react;

@implementation SkiaImageView {
  // A layer of its own: RCTViewComponentView draws backgrounds and borders
  // into the view's layer.
  SkiaPresentedImageLayer *_imageLayer;
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps =
        std::make_shared<const SkiaImageViewProps>();
    _props = defaultProps;
    _imageLayer = [SkiaPresentedImageLayer layer];
    [self.layer addSublayer:_imageLayer];
  }
  return self;
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  [_imageLayer showImageId:0];
}

// A view the recycle pool has no room for is deallocated without
// prepareForRecycle. The layer stops observing here, where it is still alive:
// in its own dealloc a weak table no longer finds it.
- (void)dealloc {
  [_imageLayer showImageId:0];
}

- (void)layoutSubviews {
  [super layoutSubviews];
  _imageLayer.frame = self.layer.bounds;
}

#pragma mark - Props

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<
      SkiaImageViewComponentDescriptor>();
}

- (void)updateProps:(const Props::Shared &)props
           oldProps:(const Props::Shared &)oldProps {
  const auto &newProps =
      *std::static_pointer_cast<const SkiaImageViewProps>(props);
  [super updateProps:props oldProps:oldProps];
  [_imageLayer showImageId:static_cast<uint32_t>(newProps.presentedImageId)];
}

@end

Class<RCTComponentViewProtocol> SkiaImageViewCls(void) {
  return SkiaImageView.class;
}
