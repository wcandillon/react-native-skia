#pragma once

#import <CoreFoundation/CoreFoundation.h>
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
- (sk_sp<SkImage>)screenshotOfViewWithTag:(NSNumber *)viewTag;

@end
