#import "SkiaManager.h"

#import <Foundation/Foundation.h>

#import <React/RCTBridge+Private.h>
#import <React/RCTBridge.h>
#import <React/RCTUIManager.h>

#import "RNSkiOSPlatformContext.h"

@implementation SkiaManager {
  std::shared_ptr<RNSkia::RNSkManager> _skManager;
  __weak RCTBridge *weakBridge;
}

- (std::shared_ptr<RNSkia::RNSkManager>)skManager {
  return _skManager;
}

- (void)invalidate {
  if (_skManager != nullptr) {
    _skManager->invalidate();
  }
  _skManager = nullptr;
}

- (instancetype)initWithBridge:(RCTBridge *)bridge
                     jsInvoker:(std::shared_ptr<facebook::react::CallInvoker>)
                                   jsInvoker {
  self = [super init];
  if (self) {
    RCTCxxBridge *cxxBridge = (RCTCxxBridge *)bridge;
    if (cxxBridge.runtime) {

      facebook::jsi::Runtime *jsRuntime =
          (facebook::jsi::Runtime *)cxxBridge.runtime;

      // Create the RNSkiaManager (cross platform)
      _skManager = std::make_shared<RNSkia::RNSkManager>(
          jsRuntime, jsInvoker,
          std::make_shared<RNSkia::RNSkiOSPlatformContext>(bridge, jsInvoker));
    }
  }
  return self;
}

@end
