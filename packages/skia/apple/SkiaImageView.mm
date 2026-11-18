#import "SkiaImageView.h"

#import <React/RCTFabricComponentsPlugins.h>

#import <react/renderer/components/rnskia/ComponentDescriptors.h>
#import <react/renderer/components/rnskia/EventEmitters.h>
#import <react/renderer/components/rnskia/Props.h>
#import <react/renderer/components/rnskia/RCTComponentViewHelpers.h>

#import "SkiaPresentedImages.h"

using namespace facebook::react;

// The component's content view, an image view as RCTImageComponentView's is:
// React Native places it in whichever view clips the component, frames it to
// the content box and masks it to the border's inner edge.
#if !TARGET_OS_OSX
@interface SkiaPresentedImageView : UIImageView <SkiaPresentedImageObserver>
#else
@interface SkiaPresentedImageView : RCTUIImageView <SkiaPresentedImageObserver>
#endif

/**
 The image to show, by id; 0 shows nothing and stops observing, which the
 view's owner does before the view goes (a weak table no longer finds an
 object being deallocated).
 */
- (void)showImageId:(uint32_t)imageId;

@end

@implementation SkiaPresentedImageView {
  // 0 shows nothing; see RNSkPresentedImages::idOf for the others.
  uint32_t _imageId;
}

- (void)showImageId:(uint32_t)imageId {
  if (imageId == _imageId) {
    return;
  }
  if (_imageId != 0) {
    [SkiaPresentedImages unobserveImageId:_imageId observer:self];
  }
  _imageId = imageId;
  if (imageId == 0) {
    [self showBitmap:nil];
    return;
  }
  // The view keeps the bitmap it shows until the new image is published, or
  // is told it failed, a failure the store keeps through a retry.
  [SkiaPresentedImages observeImageId:imageId observer:self];
}

- (void)presentedImageDidPublish:(CGImageRef)image {
  [self showBitmap:image];
}

// As React Native's Image shows nothing when its source fails.
- (void)presentedImageDidFail {
  [self showBitmap:nil];
}

- (void)showBitmap:(nullable CGImageRef)bitmap {
#if !TARGET_OS_OSX
  self.image = bitmap == nil ? nil : [UIImage imageWithCGImage:bitmap];
#else
  self.image = bitmap == nil
                   ? nil
                   : [[NSImage alloc] initWithCGImage:bitmap size:NSZeroSize];
#endif
}

@end

@implementation SkiaImageView {
  SkiaPresentedImageView *_imageView;
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps =
        std::make_shared<const SkiaImageViewProps>();
    _props = defaultProps;
    _imageView = [[SkiaPresentedImageView alloc] initWithFrame:self.bounds];
    // As RCTImageComponentView's: a bitmap drawn at another size than its own
    // is sampled from its mipmaps.
    _imageView.layer.minificationFilter = kCAFilterTrilinear;
    _imageView.layer.magnificationFilter = kCAFilterTrilinear;
    self.contentView = _imageView;
  }
  return self;
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  [_imageView showImageId:0];
}

// A view the recycle pool has no room for is deallocated without
// prepareForRecycle. The image view stops observing here, where it is still
// alive: in its own dealloc a weak table no longer finds it.
- (void)dealloc {
  [_imageView showImageId:0];
}

#pragma mark - Accessibility

// The accessibility props reach the image view, which React Native reads as
// the component's accessibility element once it is the content view, as
// RCTImageComponentView's do.
#if !TARGET_OS_OSX
- (NSObject *)accessibilityElement
#else
- (NSView *)accessibilityElement
#endif
{
  return _imageView;
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
  [_imageView showImageId:static_cast<uint32_t>(newProps.presentedImageId)];
}

@end

Class<RCTComponentViewProtocol> SkiaImageViewCls(void) {
  return SkiaImageView.class;
}
