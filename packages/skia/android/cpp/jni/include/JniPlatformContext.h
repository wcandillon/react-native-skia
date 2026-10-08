#pragma once

#include <fbjni/fbjni.h>
#include <jsi/jsi.h>

#include <exception>
#include <functional>
#include <memory>
#include <mutex>
#include <queue>
#include <string>
#include <utility>

#include "RNSkPlatformContext.h"

class SkStreamAsset;
namespace RNSkia {

namespace jsi = facebook::jsi;
namespace jni = facebook::jni;

class JniPlatformContext : public jni::HybridClass<JniPlatformContext> {
public:
  static auto constexpr kJavaDescriptor =
      "Lcom/reactnative/skia/PlatformContext;";

  static jni::local_ref<jhybriddata>
  initHybrid(jni::alias_ref<jhybridobject> jThis, const float,
             std::string cacheDirectory);

  static void registerNatives();

  void performStreamOperation(
      const std::string &sourceUri,
      const std::function<void(std::unique_ptr<SkStreamAsset>)> &op);

  void raiseError(const std::exception &err);

  void notifyTaskReadyExternal();

  void runTaskOnMainThread(std::function<void()> task);

  void notifyTaskReadyNative();

  float getPixelDensity() { return _pixelDensity; }

  const std::string &getCacheDirectory() const { return _cacheDirectory; }

  sk_sp<SkImage> takeScreenshotFromViewTag(size_t tag);

private:
  friend HybridBase;
  jni::global_ref<JniPlatformContext::javaobject> javaPart_;

  float _pixelDensity;
  std::string _cacheDirectory;
  std::mutex _mainThreadTasksMutex;
  std::queue<std::function<void()>> _mainThreadTasks;
  bool _mainThreadDispatchScheduled = false;

  explicit JniPlatformContext(
      jni::alias_ref<JniPlatformContext::jhybridobject> jThis,
      const float pixelDensity, std::string cacheDirectory)
      : javaPart_(jni::make_global(jThis)), _pixelDensity(pixelDensity),
        _cacheDirectory(std::move(cacheDirectory)) {}
};
} // namespace RNSkia
