#pragma once

#import <CoreGraphics/CoreGraphics.h>
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/** A view showing an image, told when its bitmap is published or fails. Main
 * thread. */
@protocol SkiaPresentedImageObserver <NSObject>
- (void)presentedImageDidPublish:(CGImageRef)image;
- (void)presentedImageDidFail;
@end

/**
 * The bitmaps SkiaImageViews show, by image id: one per image however many
 * views show it (see cpp/rnskia/RNSkPresentedImages.h). Native publishes a
 * bitmap once the image is drawn, fails an image no bitmap could be made
 * for, and discards it once JS releases the image; each arrives on the main
 * queue, where the views read the store.
 */
@interface SkiaPresentedImages : NSObject

+ (void)publishImage:(CGImageRef)image forId:(uint32_t)imageId;

/** The views showing the id show nothing, and so does one that starts to, until
 * it is published again. */
+ (void)failImageForId:(uint32_t)imageId;

/** A view showing the bitmap keeps it until it shows another. */
+ (void)discardImageForId:(uint32_t)imageId;

/** Tells the observer at once whether the id's bitmap is published or failed,
 * nothing while it is on its way, and from then on what happens to it. */
+ (void)observeImageId:(uint32_t)imageId
              observer:(id<SkiaPresentedImageObserver>)observer;

+ (void)unobserveImageId:(uint32_t)imageId
                observer:(id<SkiaPresentedImageObserver>)observer;

@end

NS_ASSUME_NONNULL_END
