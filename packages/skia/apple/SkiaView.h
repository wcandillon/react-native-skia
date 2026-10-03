#pragma once

#import <CoreFoundation/CoreFoundation.h>
#if !TARGET_OS_OSX
#import <UIKit/UIKit.h>
#else
#import <React/RCTUIKit.h>
#endif // !TARGET_OS_OSX

#import <React/RCTViewComponentView.h>

/**
 * The Fabric component behind <Canvas>, <SkiaPictureView> and
 * <SkiaGraphiteView>: a CAMetalLayer presenting Graphite recordings on the
 * display link. The frames are recorded by the native render thread pool
 * (declarative content) or by JS (SkiaViewApi.makeGraphiteContext).
 */
@interface SkiaView : RCTViewComponentView

@end
