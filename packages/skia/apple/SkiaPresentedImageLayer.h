#pragma once

#import <QuartzCore/QuartzCore.h>

#import "SkiaPresentedImages.h"

NS_ASSUME_NONNULL_BEGIN

/**
 * A layer showing a presented image by its id (see SkiaPresentedImages),
 * filling its bounds: the layer of a SkiaImageView, and of a static canvas.
 * It keeps the image it shows until the next one's bitmap is published, so a
 * change of image never shows nothing in between, and its contents change
 * without the implicit fade a layer's new contents would get. Main thread.
 */
@interface SkiaPresentedImageLayer : CALayer <SkiaPresentedImageObserver>

/**
 The image to show, by id; 0 shows nothing and stops observing, which the
 layer's owner does before the layer goes (a weak table no longer finds an
 object being deallocated).
 */
- (void)showImageId:(uint32_t)imageId;

@end

NS_ASSUME_NONNULL_END
