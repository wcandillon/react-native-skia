#pragma once

#import <rnskia/rnskia.h>

#include "SkiaManager.h"

@interface RNSkiaModule : NSObject <NativeSkiaModuleSpec>

- (SkiaManager *)manager;

@end
