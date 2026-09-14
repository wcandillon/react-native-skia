#import "SkiaManager.h"

#import <Foundation/Foundation.h>

#import <React/RCTBridge.h>
#import <React/RCTUIManager.h>

#import "RNSkApplePlatformContext.h"

// Forward-declared runtime accessor that is satisfied by RCTCxxBridge
// (legacy/transitional) and RCTBridgeProxy (bridgeless). Avoids referencing
// RCTCxxBridge directly, which is compiled out when RCT_REMOVE_LEGACY_ARCH
// is set (React Native 0.82+).
@interface RCTBridge (RNSkiaRuntime)
- (void *)runtime;
@end

static __weak SkiaManager *sharedInstance = nil;

@implementation SkiaManager {
  std::shared_ptr<RNSkia::RNSkManager> _skManager;
  __weak RCTBridge *weakBridge;
}

- (std::shared_ptr<RNSkia::RNSkManager>)skManager {
  return _skManager;
}

- (void)invalidate {
  _skManager = nullptr;
}

- (instancetype)initWithBridge:(RCTBridge *)bridge
                     jsInvoker:(std::shared_ptr<facebook::react::CallInvoker>)
                                   jsInvoker {
  self = [super init];
  if (self) {
    sharedInstance = self;
    if (bridge.runtime) {
      facebook::jsi::Runtime *jsRuntime =
          (facebook::jsi::Runtime *)bridge.runtime;

      // Create the RNSkiaManager (cross platform)
      _skManager = std::make_shared<RNSkia::RNSkManager>(
          jsRuntime, jsInvoker,
          std::make_shared<RNSkia::RNSkApplePlatformContext>(bridge,
                                                             jsInvoker));
    }
  }
  return self;
}

- (void)dealloc {
  sharedInstance = nil;
}

#ifdef RCT_NEW_ARCH_ENABLED
+ (std::shared_ptr<RNSkia::RNSkManager>)latestActiveSkManager {
  if (sharedInstance != nil) {
    return [sharedInstance skManager];
  }
  return nullptr;
}
#endif // RCT_NEW_ARCH_ENABLED
@end
