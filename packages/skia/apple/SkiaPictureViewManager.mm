
#include "SkiaPictureViewManager.h"
#include <React/RCTBridge+Private.h>

#include "RNSkAppleView.h"
#include "RNSkPictureView.h"
#include "RNSkPlatformContext.h"

#include "RNSkiaModule.h"
#include "SkiaManager.h"
#include "SkiaUIView.h"

@implementation SkiaPictureViewManager

RCT_EXPORT_MODULE(SkiaPictureView)

- (SkiaManager *)skiaManager {
  auto bridge = self.bridge;
  RCTAssert(bridge, @"Bridge must not be nil.");
  auto skiaModule = (RNSkiaModule *)[bridge moduleForName:@"RNSkiaModule"];
  return [skiaModule manager];
}

RCT_CUSTOM_VIEW_PROPERTY(nativeID, NSNumber, SkiaUIView) {
  // Get parameter
  int nativeId = [[RCTConvert NSString:json] intValue];
  [(SkiaUIView *)view setNativeId:nativeId];
}

RCT_CUSTOM_VIEW_PROPERTY(debug, BOOL, SkiaUIView) {
  bool debug = json != NULL ? [RCTConvert BOOL:json] : false;
  [(SkiaUIView *)view setDebugMode:debug];
}

RCT_CUSTOM_VIEW_PROPERTY(opaque, BOOL, SkiaUIView) {
  bool opaque = json != NULL ? [RCTConvert BOOL:json] : false;
  [(SkiaUIView *)view setOpaque:opaque];
}

#if !TARGET_OS_OSX
- (UIView *)view {
#else
- (RCTUIView *)view {
#endif // !TARGET_OS_OSX
  auto skManager = [[self skiaManager] skManager];
  // Pass SkManager as a raw pointer to avoid circular dependenciesr
  return [[SkiaUIView alloc]
      initWithManager:skManager.get()
              factory:[](std::shared_ptr<RNSkia::RNSkPlatformContext> context) {
                return std::make_shared<RNSkAppleView<RNSkia::RNSkPictureView>>(
                    context);
              }];
}

@end
