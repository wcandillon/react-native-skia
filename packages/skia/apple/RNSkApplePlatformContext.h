#pragma once

#import <React/RCTBridgeModule.h>

#include <functional>
#include <memory>
#include <string>

#include "RNSkPlatformContext.h"
#include "ViewScreenshotService.h"

namespace facebook {
namespace react {
class CallInvoker;
}
} // namespace facebook

namespace RNSkia {

class RNSkApplePlatformContext : public RNSkPlatformContext {
public:
  RNSkApplePlatformContext(
      RCTViewRegistry *viewRegistry,
      std::shared_ptr<facebook::react::CallInvoker> jsCallInvoker)
#if !TARGET_OS_OSX
      : RNSkPlatformContext(jsCallInvoker, [[UIScreen mainScreen] scale]) {
#else
      : RNSkPlatformContext(jsCallInvoker,
                            [[NSScreen mainScreen] backingScaleFactor]) {
#endif // !TARGET_OS_OSX

    // Create screenshot manager
    _screenshotService =
        [[ViewScreenshotService alloc] initWithViewRegistry:viewRegistry];
    _prefersP3ColorSpace = mainScreenSupportsP3();
  }

  ~RNSkApplePlatformContext() = default;

  /**
   Whether the main screen has a wide color gamut (Display P3). The screen is
   asked once and the answer is kept: RNSkiaModule asks first, on the main
   queue it is created on, so that the context (created on the JS thread)
   only reads the answer.
   */
  static bool mainScreenSupportsP3();

  bool prefersP3ColorSpace() override { return _prefersP3ColorSpace; }

  std::string getCacheDirectory() override;

  void runOnMainThread(std::function<void()>) override;

  sk_sp<SkImage> takeScreenshotFromViewTag(size_t tag) override;

  virtual void performStreamOperation(
      const std::string &sourceUri,
      const std::function<void(std::unique_ptr<SkStreamAsset>)> &op) override;

  void raiseError(const std::exception &err) override;
  sk_sp<SkSurface> makeOffscreenSurface(int width, int height,
                                        bool useP3ColorSpace = false) override;

  sk_sp<SkFontMgr> createFontMgr() override;

  std::vector<std::string> getSystemFontFamilies() override;

  std::string resolveFontFamily(const std::string &familyName) override;

private:
  ViewScreenshotService *_screenshotService;
  bool _prefersP3ColorSpace = false;
};

} // namespace RNSkia
