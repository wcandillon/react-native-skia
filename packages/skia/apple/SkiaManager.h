#pragma once

#import <React/RCTBridge.h>

#import "RNSkManager.h"

@interface SkiaManager : NSObject

- (std::shared_ptr<RNSkia::RNSkManager>)skManager;

- (instancetype)init NS_UNAVAILABLE;

- (void)invalidate;

- (instancetype)initWithBridge:(RCTBridge *)bridge
                     jsInvoker:(std::shared_ptr<facebook::react::CallInvoker>)
                                   jsInvoker;

#ifdef RCT_NEW_ARCH_ENABLED
// Fabric components do not have a better way to interact with TurboModules.
// Workaround to get the SkManager instance from singleton.
+ (std::shared_ptr<RNSkia::RNSkManager>)latestActiveSkManager;
#endif // RCT_NEW_ARCH_ENABLED

@end
