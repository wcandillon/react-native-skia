#pragma once

#import <memory>
#import <string>

#import <CoreFoundation/CoreFoundation.h>
#if !TARGET_OS_OSX
#import <UIKit/UIKit.h>
#else
#import <React/RCTUIKit.h>
#endif // !TARGET_OS_OSX

#import "RNSkManager.h"
#import "RNSkAppleView.h"
#import "SkiaManager.h"

#if RCT_NEW_ARCH_ENABLED
#import <React/RCTViewComponentView.h>
#endif // RCT_NEW_ARCH_ENABLED

@interface SkiaUIView :
#if RCT_NEW_ARCH_ENABLED
    RCTViewComponentView
#else
#if !TARGET_OS_OSX
    UIView
#else
    RCTUIView
#endif // !TARGET_OS_OSX
#endif // RCT_NEW_ARCH_ENABLED

- (instancetype)
    initWithManager:(RNSkia::RNSkManager *)manager
            factory:(std::function<std::shared_ptr<RNSkBaseAppleView>(
                         std::shared_ptr<RNSkia::RNSkPlatformContext>)>)factory;
- (void)initCommon:(RNSkia::RNSkManager *)manager
           factory:(std::function<std::shared_ptr<RNSkBaseAppleView>(
                        std::shared_ptr<RNSkia::RNSkPlatformContext>)>)factory;
- (std::shared_ptr<RNSkBaseAppleView>)impl;

- (void)setDebugMode:(bool)debugMode;
- (void)setOpaque:(bool)opaque;
- (void)setNativeId:(size_t)nativeId;

@end
