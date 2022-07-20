#import <React/RCTBridge.h>

#import <SkiaDrawView.h>

#include <utility>
#include <vector>

#import <RNSkDrawView.h>
#import <RNSkManager.h>
#import <SkiaMetalRenderer.h>

@implementation SkiaDrawView

#pragma mark API

-(void) viewDidBecomeReady:(std::shared_ptr<RNSkia::RNSkBaseDrawView>)view {
  [self manager]->setSkiaDrawView([self nativeId], std::dynamic_pointer_cast<RNSkia::RNSkDrawView>([self impl]));
}

- (std::shared_ptr<RNSkia::RNSkBaseDrawView>) createDrawView {
  return std::make_shared<RNSkia::RNSkDrawView>(std::make_shared<SkiaMetalRenderer>([self manager]->getPlatformContext()),
                                                [self manager]->getPlatformContext());
}


- (void) didSetNativeId:(size_t) nativeId {
  if([self impl] != nullptr) {
    [self manager]->registerSkiaDrawView(nativeId, std::dynamic_pointer_cast<RNSkia::RNSkDrawView>([self impl]));
  }
}

#pragma mark Lifecycle

- (void) dealloc {
  if([self manager] != nullptr && [self nativeId] != 0) {
    [self manager]->unregisterSkiaDrawView([self nativeId]);
  }
}

@end
