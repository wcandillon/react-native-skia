#pragma once

#import <memory>
#import <string>

#import <CoreFoundation/CoreFoundation.h>
#if !TARGET_OS_OSX
#import <UIKit/UIKit.h>
#else
#import <React/RCTUIKit.h>
#endif // !TARGET_OS_OSX

#import <React/RCTViewComponentView.h>

#import "RNSkAppleView.h"
#import "RNSkManager.h"
#import "SkiaManager.h"

@interface SkiaUIView : RCTViewComponentView

- (void)initCommon:(RNSkia::RNSkManager *)manager
           factory:(std::function<std::shared_ptr<RNSkBaseAppleView>(
                        std::shared_ptr<RNSkia::RNSkPlatformContext>)>)factory;
- (std::shared_ptr<RNSkBaseAppleView>)impl;

- (void)setDebugMode:(bool)debugMode;
- (void)setOpaque:(bool)opaque;
- (void)setNativeId:(size_t)nativeId;
- (void)setUseP3ColorSpace:(bool)useP3ColorSpace;
- (void)setHighBitDepth:(bool)highBitDepth;

@end
