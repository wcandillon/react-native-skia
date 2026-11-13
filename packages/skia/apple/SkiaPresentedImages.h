#pragma once

#import <CoreGraphics/CoreGraphics.h>
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/** A view showing an image, told when its bitmap is published. Main thread. */
@protocol SkiaPresentedImageObserver <NSObject>
- (void)presentedImageDidPublish:(CGImageRef)image;
@end

/**
 * The bitmaps SkiaImageViews show, by image id: one per image however many
 * views show it (see cpp/rnskia/RNSkPresentedImages.h). Native publishes a
 * bitmap once the image is read back and discards it once JS releases the
 * image; both arrive on the main queue, where the views read the store.
 */
@interface SkiaPresentedImages : NSObject

+ (void)publishImage:(CGImageRef)image forId:(uint32_t)imageId;

/** A view showing the bitmap keeps it until it shows another. */
+ (void)discardImageForId:(uint32_t)imageId;

/** The bitmap of the id, if published yet; the observer is told when it is. */
+ (nullable CGImageRef)observeImageId:(uint32_t)imageId
                             observer:(id<SkiaPresentedImageObserver>)observer
    CF_RETURNS_NOT_RETAINED;

+ (void)unobserveImageId:(uint32_t)imageId
                observer:(id<SkiaPresentedImageObserver>)observer;

@end

NS_ASSUME_NONNULL_END
