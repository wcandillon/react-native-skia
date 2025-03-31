#pragma once

#import <React/RCTBridge+Private.h>
#import <React/RCTBridge.h>

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
      RCTBridge *bridge,
      std::shared_ptr<facebook::react::CallInvoker> jsCallInvoker)
#if !TARGET_OS_OSX
      : RNSkPlatformContext(jsCallInvoker, [[UIScreen mainScreen] scale]) {
#else
      : RNSkPlatformContext(jsCallInvoker, [[NSScreen mainScreen] backingScaleFactor]) {
#endif // !TARGET_OS_OSX

    // Create screenshot manager
    _screenshotService =
        [[ViewScreenshotService alloc] initWithUiManager:bridge.uiManager];
  }

  ~RNSkApplePlatformContext() = default;

  void runOnMainThread(std::function<void()>) override;

  sk_sp<SkImage> takeScreenshotFromViewTag(size_t tag) override;

  sk_sp<SkImage> makeImageFromNativeBuffer(void *buffer) override;

  sk_sp<SkImage> makeImageFromNativeTexture(const TextureInfo &textureInfo,
                                            int width, int height,
                                            bool mipMapped) override;

  uint64_t makeNativeBuffer(sk_sp<SkImage> image) override;

  const TextureInfo getTexture(sk_sp<SkSurface> image) override;

  const TextureInfo getTexture(sk_sp<SkImage> image) override;

  void releaseNativeBuffer(uint64_t pointer) override;

  std::shared_ptr<RNSkVideo> createVideo(const std::string &url) override;

  std::shared_ptr<WindowContext>
  makeContextFromNativeSurface(void *surface, int width, int height) override;

  virtual void performStreamOperation(
      const std::string &sourceUri,
      const std::function<void(std::unique_ptr<SkStreamAsset>)> &op) override;

  void raiseError(const std::exception &err) override;
  sk_sp<SkSurface> makeOffscreenSurface(int width, int height) override;
#if !defined(SK_GRAPHITE)
  GrDirectContext *getDirectContext() override;
#endif
  sk_sp<SkFontMgr> createFontMgr() override;

private:
  ViewScreenshotService *_screenshotService;

  SkColorType mtlPixelFormatToSkColorType(MTLPixelFormat pixelFormat);
};

} // namespace RNSkia
