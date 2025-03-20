#pragma once

#import <memory>
#import <string>

#import <CoreFoundation/CoreFoundation.h>
#import <UIKit/UIKit.h>

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
    UIView
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
