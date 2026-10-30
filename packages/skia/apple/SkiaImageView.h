#pragma once

#import <CoreFoundation/CoreFoundation.h>
#if !TARGET_OS_OSX
#import <UIKit/UIKit.h>
#else
#import <React/RCTUIKit.h>
#endif // !TARGET_OS_OSX

#import <React/RCTViewComponentView.h>

/**
 * The Fabric component behind <SkiaImageView>: a layer whose contents are its
 * image's bitmap, shared with every view showing the same image. It has no
 * Metal layer, display link or native Skia view, so it mounts and unmounts at
 * the cost of any view, and it composites, clips, fades and transforms like
 * one.
 */
@interface SkiaImageView : RCTViewComponentView

@end
