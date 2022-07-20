

#pragma once

#import <memory>
#import <string>

#import <CoreFoundation/CoreFoundation.h>
#import <UIKit/UIKit.h>

#import <RNSkManager.h>
#import <RNSkBaseDrawView.h>

@interface SkiaView : UIView

- (instancetype)initWithManager: (RNSkia::RNSkManager*)manager;
- (void) setDrawingMode:(std::string) mode;
- (void) setDebugMode:(bool) debugMode;
- (std::shared_ptr<RNSkia::RNSkBaseDrawView>) createDrawView;
- (void) viewDidBecomeReady:(std::shared_ptr<RNSkia::RNSkBaseDrawView>) view;
- (void) didSetNativeId: (size_t) nativeId;
- (RNSkia::RNSkManager*) manager;
- (std::shared_ptr<RNSkia::RNSkBaseDrawView>) impl;
- (size_t) nativeId;
- (void) setNativeId:(size_t) nativeId;

@end
