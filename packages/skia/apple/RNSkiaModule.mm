#import "RNSkiaModule.h"

#import <ReactCommon/RCTTurboModule.h>

#import "RNSkApplePlatformContext.h"

static __weak RNSkiaModule *sharedInstance = nil;

@implementation RNSkiaModule {
  // Handed to us by React Native when JS first requires the module (see
  // installJSIBindingsWithRuntime:callInvoker:), which always happens before
  // JS calls install(). Valid until invalidate.
  facebook::jsi::Runtime *_runtime;
  std::shared_ptr<facebook::react::CallInvoker> _jsInvoker;
  std::shared_ptr<RNSkia::RNSkManager> _skManager;
}

RCT_EXPORT_MODULE()
// Injected by React Native (bridgeless included). It is how a module looks up
// a native view by react tag without touching RCTBridge or RCTUIManager.
@synthesize viewRegistry_DEPRECATED = _viewRegistry_DEPRECATED;

#pragma mark Accessors

- (std::shared_ptr<RNSkia::RNSkManager>)skManager {
  return _skManager;
}

+ (std::shared_ptr<RNSkia::RNSkManager>)latestActiveSkManager {
  if (sharedInstance != nil) {
    return [sharedInstance skManager];
  }
  return nullptr;
}

#pragma mark Setup and invalidation

+ (BOOL)requiresMainQueueSetup {
  return YES;
}

- (instancetype)init {
  if (self = [super init]) {
    // Created on the main queue (see requiresMainQueueSetup): the screen is
    // asked for its color gamut here, where UIKit may be used. The platform
    // context is created on the JS thread and only reads the answer.
    RNSkia::RNSkApplePlatformContext::mainScreenSupportsP3();
  }
  return self;
}

- (void)
    installJSIBindingsWithRuntime:(facebook::jsi::Runtime &)runtime
                      callInvoker:
                          (const std::shared_ptr<facebook::react::CallInvoker>
                               &)callInvoker {
  _runtime = &runtime;
  _jsInvoker = callInvoker;
}

- (void)invalidate {
  _skManager = nullptr;
  _runtime = nullptr;
  _jsInvoker = nullptr;
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(install) {
  if (_skManager != nullptr) {
    // Already initialized, ignore call.
    return @true;
  }
  if (_runtime == nullptr || _jsInvoker == nullptr) {
    NSLog(@"[RNSkiaModule] Failed to install: the JS runtime has not been "
          @"provided to the module yet.");
    return @false;
  }
  sharedInstance = self;
  _skManager = std::make_shared<RNSkia::RNSkManager>(
      _runtime, _jsInvoker,
      std::make_shared<RNSkia::RNSkApplePlatformContext>(
          self.viewRegistry_DEPRECATED, _jsInvoker));
  return @true;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeSkiaModuleSpecJSI>(params);
}

@end
