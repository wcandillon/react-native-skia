#pragma once

#import <CoreFoundation/CoreFoundation.h>
#import <CoreVideo/CoreVideo.h>
#if !TARGET_OS_OSX
#import <UIKit/UIKit.h>
#else
#import <Appkit/Appkit.h>
#endif // !TARGET_OS_OSX

#import <React/RCTUIManager.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkImage.h"

#pragma clang diagnostic pop

@interface ViewScreenshotService : NSObject {
}

- (instancetype)initWithUiManager:(RCTUIManager *)uiManager;

// Renders the view identified by `viewTag` into a fresh IOSurface-backed
// CVPixelBuffer at the screen's native scale, BGRA, premultiplied alpha.
// Returns a +1 retained CVPixelBufferRef the caller must release, or NULL
// on failure (view not found, zero size, allocation failure).
- (CVPixelBufferRef)pixelBufferOfViewWithTag:(NSNumber *)viewTag
    CF_RETURNS_RETAINED;

@end
