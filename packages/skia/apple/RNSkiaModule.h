#pragma once

#import <ReactCommon/RCTTurboModuleWithJSIBindings.h>
#import <rnskia/rnskia.h>

#include <memory>

#include "RNSkManager.h"

@interface RNSkiaModule
    : NSObject <NativeSkiaModuleSpec, RCTTurboModuleWithJSIBindings>

- (std::shared_ptr<RNSkia::RNSkManager>)skManager;

// Fabric components do not have a better way to interact with TurboModules.
// Workaround to get the SkManager instance from singleton.
+ (std::shared_ptr<RNSkia::RNSkManager>)latestActiveSkManager;

@end
