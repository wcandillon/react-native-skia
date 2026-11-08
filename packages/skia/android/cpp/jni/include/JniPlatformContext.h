#pragma once

#include <fbjni/fbjni.h>
#include <jsi/jsi.h>

#include <exception>
#include <functional>
#include <memory>
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

  // PresentThread.post: runs the Java task on the present thread, under a
  // thread scope, as the thread is the native side's and not attached to
  // the JVM on its own.
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

  float getPixelDensity() { return _pixelDensity; }

private:
  friend HybridBase;
  jni::global_ref<JniPlatformContext::javaobject> javaPart_;

  float _pixelDensity;

  explicit JniPlatformContext(
      jni::alias_ref<JniPlatformContext::jhybridobject> jThis,
      const float pixelDensity)
      : javaPart_(jni::make_global(jThis)), _pixelDensity(pixelDensity) {}
};
} // namespace RNSkia
