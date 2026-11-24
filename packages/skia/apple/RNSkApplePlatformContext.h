#pragma once

#import <CoreFoundation/CoreFoundation.h>
#if !TARGET_OS_OSX
#import <UIKit/UIKit.h>
#else
#import <AppKit/AppKit.h>
#endif // !TARGET_OS_OSX

#include <functional>
#include <memory>
#include <string>

#include "RNSkPlatformContext.h"

namespace facebook {
namespace react {
class CallInvoker;
}
} // namespace facebook

namespace RNSkia {

class RNSkApplePlatformContext : public RNSkPlatformContext {
public:
  RNSkApplePlatformContext(
      std::shared_ptr<facebook::react::CallInvoker> jsCallInvoker)
#if !TARGET_OS_OSX
      : RNSkPlatformContext(jsCallInvoker, [[UIScreen mainScreen] scale]) {
#else
      : RNSkPlatformContext(jsCallInvoker,
                            [[NSScreen mainScreen] backingScaleFactor]) {
#endif // !TARGET_OS_OSX
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

  /**
   Keeps DawnContext::isForeground up to date from the application's
   notifications: false from UIApplicationWillResignActive until
   UIApplicationDidBecomeActive, as Apple asks Metal apps to stop submitting
   work when deactivated. Called once, on the main thread (RNSkiaModule's
   init), where alone the application state may be read; nothing on macOS,
   where a hidden app may use the GPU.
   */
  static void observeApplicationState();

  bool prefersP3ColorSpace() override { return _prefersP3ColorSpace; }

  void runOnMainThread(std::function<void()>) override;

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
  bool _prefersP3ColorSpace = false;
};

} // namespace RNSkia
