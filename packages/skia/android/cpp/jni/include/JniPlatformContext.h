#pragma once

#include <fbjni/NativeRunnable.h>
#include <fbjni/fbjni.h>
#include <jsi/jsi.h>

#include <atomic>
#include <exception>
#include <functional>
#include <memory>
#include <mutex>
#include <string>

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
  initHybrid(jni::alias_ref<jhybridobject> jThis, const float);

  static void registerNatives();

  // Whether the app is in the foreground (see DawnContext::isForeground),
  // from the host activity's lifecycle. Static: it does not need the context,
  // and outlives it.
  static void setForegroundNative(jni::alias_ref<jclass>, jboolean foreground);

  static void setCacheDirectoryNative(jni::alias_ref<jclass>,
                                      jni::alias_ref<jni::JString> directory);

  // PresentThread.post: runs the Java task on the present thread, which is
  // the native side's and attached to the JVM for good by its first task
  // (see attachPresentThread). Registered on PresentThread, not on the
  // context's class.
  static void postNative(jni::alias_ref<jclass>,
                         jni::alias_ref<jni::JRunnable::javaobject> task);

  // PresentThread.postAndWait (see rnsurface::RenderThread::postAndWait).
  static jboolean
  postAndWaitNative(jni::alias_ref<jclass>,
                    jni::alias_ref<jni::JRunnable::javaobject> task,
                    jlong timeoutMs);

  void performStreamOperation(
      const std::string &sourceUri,
      const std::function<void(std::unique_ptr<SkStreamAsset>)> &op);

  void raiseError(const std::exception &err);

  void runTaskOnMainThread(std::function<void()> task);

  static int duplicateMainThreadWakeup(jni::alias_ref<jclass>);

  static void runMainThreadTasks(jni::alias_ref<jclass>);

  float getPixelDensity() { return _pixelDensity.load(); }

  // The display density changed (a configuration change, see
  // PlatformContext.java): the platform context and its views follow it.
  void setPixelDensity(float pixelDensity);

  // The platform context made from this one, kept up to date with the
  // display density.
  void setPlatformContext(const std::shared_ptr<RNSkPlatformContext> &context);

private:
  friend HybridBase;
  jni::global_ref<JniPlatformContext::javaobject> javaPart_;

  std::atomic<float> _pixelDensity;
  std::mutex _platformContextMutex;
  std::weak_ptr<RNSkPlatformContext> _platformContext;

  explicit JniPlatformContext(
      jni::alias_ref<JniPlatformContext::jhybridobject> jThis,
      const float pixelDensity)
      : javaPart_(jni::make_global(jThis)), _pixelDensity(pixelDensity) {}
};
} // namespace RNSkia
