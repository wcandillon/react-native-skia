#pragma once

// TODO: Add android flags
#if __ANDROID_API__ >= 26
#include <android/hardware_buffer.h>
#endif
#include <exception>
#include <functional>
#include <memory>
#include <string>

#include "DawnContext.h"
#include "JniPlatformContext.h"
#include "RNSkAndroidVideo.h"
#include "RNSkPlatformContext.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/ports/SkFontMgr_android.h"

#pragma clang diagnostic pop

namespace RNSkia {
namespace jsi = facebook::jsi;

class RNSkAndroidPlatformContext : public RNSkPlatformContext {
public:
  RNSkAndroidPlatformContext(
      JniPlatformContext *jniPlatformContext, jsi::Runtime *runtime,
      std::shared_ptr<facebook::react::CallInvoker> jsCallInvoker)
      : RNSkPlatformContext(runtime, jsCallInvoker,
                            jniPlatformContext->getPixelDensity()),
        _jniPlatformContext(jniPlatformContext) {
    // Hook onto the notify draw loop callback in the platform context
    jniPlatformContext->setOnNotifyDrawLoop(
        [this]() { notifyDrawLoop(false); });
  }

  ~RNSkAndroidPlatformContext() { stopDrawLoop(); }

  void performStreamOperation(
      const std::string &sourceUri,
      const std::function<void(std::unique_ptr<SkStreamAsset>)> &op) override {
    _jniPlatformContext->performStreamOperation(sourceUri, op);
  }

  void raiseError(const std::exception &err) override {
    _jniPlatformContext->raiseError(err);
  }

  sk_sp<SkSurface> makeOffscreenSurface(int width, int height) override {
    return DawnContext::getInstance().MakeOffscreen(width, height);
  }

  std::shared_ptr<WindowContext>
  makeContextFromNativeSurface(void *surface, int width, int height) override {
    return DawnContext::getInstance().MakeWindow(surface, width, height);
  }

  sk_sp<SkImage> makeImageFromNativeBuffer(void *buffer) override {
    return DawnContext::getInstance().MakeImageFromBuffer(buffer);
  }

  std::shared_ptr<RNSkVideo> createVideo(const std::string &url) override {
    auto jniVideo = _jniPlatformContext->createVideo(url);
    return std::make_shared<RNSkAndroidVideo>(jniVideo);
  }

  void releaseNativeBuffer(uint64_t pointer) override {
    // TODO: implement
  }

  uint64_t makeNativeBuffer(sk_sp<SkImage> image) override {
    // TODO: implement
    return 0;
  }

  sk_sp<SkFontMgr> createFontMgr() override {
    return SkFontMgr_New_Android(nullptr);
  }

  void runOnMainThread(std::function<void()> task) override {
    _jniPlatformContext->runTaskOnMainThread(task);
  }

  sk_sp<SkImage> takeScreenshotFromViewTag(size_t tag) override {
    return _jniPlatformContext->takeScreenshotFromViewTag(tag);
  }

  void startDrawLoop() override { _jniPlatformContext->startDrawLoop(); }

  void stopDrawLoop() override { _jniPlatformContext->stopDrawLoop(); }

private:
  JniPlatformContext *_jniPlatformContext;
};

} // namespace RNSkia
