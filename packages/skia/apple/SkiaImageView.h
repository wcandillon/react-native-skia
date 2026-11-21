#pragma once

#import <CoreFoundation/CoreFoundation.h>
#if !TARGET_OS_OSX
#import <UIKit/UIKit.h>
#else
#import <React/RCTUIKit.h>
#endif // !TARGET_OS_OSX

#import <React/RCTViewComponentView.h>

/**
 * The Fabric component behind <SkiaImageView>: an image view, its content
 * view, showing its image's bitmap, shared with every view showing the same
 * image, filling the content box. It has no Metal layer, display link or
 * native Skia view: it mounts and unmounts as any view does, and composites,
 * clips, fades and transforms like one.
 */
@interface SkiaImageView : RCTViewComponentView

@end
