#import <React/RCTBridge.h>

#import "RNSkiaModule.h"
#import "SkiaUIView.h"

#include <utility>
#include <vector>

#import "RNSkManager.h"

@implementation SkiaUIView {
  std::shared_ptr<RNSkBaseAppleView> _impl;
  RNSkia::RNSkManager *_manager;
  std::function<std::shared_ptr<RNSkBaseAppleView>(
      std::shared_ptr<RNSkia::RNSkPlatformContext>)>
      _factory;
  bool _debugMode;
  bool _opaque;
  size_t _nativeId;
}

#pragma mark Initialization and destruction

- (instancetype)initWithManager:(RNSkia::RNSkManager *)manager
                        factory:
                            (std::function<std::shared_ptr<RNSkBaseAppleView>(
                                 std::shared_ptr<RNSkia::RNSkPlatformContext>)>)
                                factory {
  self = [super init];
  if (self) {
    [self initCommon:manager factory:factory];
  }
  // Listen to notifications about module invalidation
  [[NSNotificationCenter defaultCenter]
      addObserver:self
         selector:@selector(willInvalidateModules)
             name:RCTBridgeWillInvalidateModulesNotification
           object:nil];
  return self;
}

- (void)initCommon:(RNSkia::RNSkManager *)manager
           factory:(std::function<std::shared_ptr<RNSkBaseAppleView>(
                        std::shared_ptr<RNSkia::RNSkPlatformContext>)>)factory {
  _manager = manager;
  _nativeId = 0;
  _debugMode = false;
  _factory = factory;
}

- (void)willInvalidateModules {
  _impl = nullptr;
  _manager = nullptr;
}

#pragma mark Lifecycle

#if !TARGET_OS_OSX
- (void)willMoveToSuperview:(UIView *)newSuperView {
#else
- (void)viewWillMoveToSuperview:(NSView *)newSuperView {
#endif // !TARGET_OS_OSX
  if (newSuperView != nullptr) {
    // Create implementation view when the parent view is set
    if (_impl == nullptr && _manager != nullptr) {
      _impl = _factory(_manager->getPlatformContext());
      if (_impl == nullptr) {
        throw std::runtime_error(
            "Expected Skia view implementation, got nullptr.");
      }
      [self.layer addSublayer:_impl->getLayer()];
      if (_nativeId != 0) {
        _manager->setSkiaView(_nativeId, _impl->getDrawView());
      }
      _impl->getDrawView()->setShowDebugOverlays(_debugMode);
    }
  }
}

- (void)removeFromSuperview {
  // Cleanup when removed from view hierarchy
  if (_impl != nullptr) {
    [_impl->getLayer() removeFromSuperlayer];

    if (_nativeId != 0 && _manager != nullptr) {
      _manager->setSkiaView(_nativeId, nullptr);
    }

    _impl = nullptr;
  }

  [super removeFromSuperview];
}

- (void)dealloc {
  [self unregisterView];
  [[NSNotificationCenter defaultCenter]
      removeObserver:self
                name:RCTBridgeWillInvalidateModulesNotification
              object:nil];
}

#ifdef RCT_NEW_ARCH_ENABLED
- (void)prepareForRecycle {
  [super prepareForRecycle];
  [self unregisterView];
}

- (void)finalizeUpdates:(RNComponentViewUpdateMask)updateMask {
  [super finalizeUpdates:updateMask];
  if (updateMask == RNComponentViewUpdateMaskAll) {
    // this flag is only set when the view is inserted and we want to set the
    // manager here since the view could be recycled or the app could be
    // refreshed and we would have a stale manager then
    _manager = [SkiaManager latestActiveSkManager].get();
  }
}
#endif // RCT_NEW_ARCH_ENABLED

- (void)unregisterView {
  if (_manager != nullptr && _nativeId != 0) {
    _manager->unregisterSkiaView(_nativeId);
  }
}

#pragma Render

- (void)drawRect:(CGRect)rect {
  // We override drawRect to ensure we to direct rendering when the
  // underlying OS view needs to render:
  if (_impl != nullptr) {
    _impl->getDrawView()->redraw();
  }
}

#pragma mark Layout

- (void)layoutSubviews {
  [super layoutSubviews];
  if (_impl != nullptr) {
    _impl->setSize(self.bounds.size.width, self.bounds.size.height);
  }
}

#pragma mark Properties

- (void)setDebugMode:(bool)debugMode {
  _debugMode = debugMode;
  if (_impl != nullptr) {
    _impl->getDrawView()->setShowDebugOverlays(debugMode);
  }
}

- (void)setOpaque:(bool)opaque {
  _opaque = opaque;
}

- (void)setNativeId:(size_t)nativeId {
  _nativeId = nativeId;

  if (_impl != nullptr) {
    _manager->registerSkiaView(nativeId, _impl->getDrawView());
  }
}

#pragma mark External API

- (std::shared_ptr<RNSkBaseAppleView>)impl {
  return _impl;
}

@end
