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
  }

  ~RNSkApplePlatformContext() = default;

  void runOnMainThread(std::function<void()>) override;

  sk_sp<SkImage> takeScreenshotFromViewTag(size_t tag) override;

  sk_sp<SkImage> makeImageFromNativeBuffer(void *buffer) override;

  uint64_t makeNativeBuffer(sk_sp<SkImage> image) override;

  uint64_t makeTestNativeBuffer(int width, int height) override;

  void releaseNativeBuffer(uint64_t pointer) override;

  std::shared_ptr<RNSkVideo> createVideo(const std::string &url) override;

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
};

} // namespace RNSkia
