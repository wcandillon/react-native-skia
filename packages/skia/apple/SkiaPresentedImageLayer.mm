#import "SkiaPresentedImageLayer.h"

@implementation SkiaPresentedImageLayer {
  // 0 shows nothing; see RNSkPresentedImages::idOf for the others.
  uint32_t _imageId;
}

- (instancetype)init {
  if (self = [super init]) {
    _imageId = 0;
    self.contentsGravity = kCAGravityResize;
    self.actions = @{
      @"contents" : [NSNull null],
      @"bounds" : [NSNull null],
      @"position" : [NSNull null],
    };
  }
  return self;
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
    self.contents = nil;
    return;
  }
  CGImageRef image = [SkiaPresentedImages observeImageId:imageId observer:self];
  if (image != nil) {
    self.contents = (__bridge id)image;
  }
}

- (void)presentedImageDidPublish:(CGImageRef)image {
  self.contents = (__bridge id)image;
}

@end
