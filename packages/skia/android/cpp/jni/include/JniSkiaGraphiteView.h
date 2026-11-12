#pragma once

#include <memory>

#include <fbjni/fbjni.h>
#include <jni.h>

#include "JniSkiaManager.h"
#include "RNSkLog.h"

#if defined(SK_GRAPHITE)
#include "JniSkiaBaseView.h"
#include "RNSkAndroidView.h"
#include "RNSkGraphiteView.h"
#endif

namespace RNSkia {
namespace jni = facebook::jni;

#if defined(SK_GRAPHITE)

/**
 * The Android side of SkiaGraphiteView: a SkiaBaseView whose frames are
 * Graphite recordings, presented on the Choreographer.
 */
class JniSkiaGraphiteView : public jni::HybridClass<JniSkiaGraphiteView>,
                            public JniSkiaBaseView {
public:
  static auto constexpr kJavaDescriptor =
      "Lcom/reactnative/skia/SkiaGraphiteView;";

  static jni::local_ref<jhybriddata>
  initHybrid(jni::alias_ref<jhybridobject> jThis,
             jni::alias_ref<JniSkiaManager::javaobject> skiaManager) {
    return makeCxxInstance(jThis, skiaManager);
  }

  static void registerNatives() {
    registerHybrid(
        {makeNativeMethod("initHybrid", JniSkiaGraphiteView::initHybrid),
         makeNativeMethod("surfaceAvailable",
                          JniSkiaGraphiteView::surfaceAvailable),
         makeNativeMethod("surfaceDestroyed",
                          JniSkiaGraphiteView::surfaceDestroyed),
         makeNativeMethod("surfaceSizeChanged",
                          JniSkiaGraphiteView::surfaceSizeChanged),
         makeNativeMethod("setPixelDensity",
                          JniSkiaGraphiteView::setPixelDensity),
         makeNativeMethod("setDebugMode", JniSkiaGraphiteView::setDebugMode),
         makeNativeMethod("registerView", JniSkiaGraphiteView::registerView),
         makeNativeMethod("unregisterView",
                          JniSkiaGraphiteView::unregisterView),
         makeNativeMethod("getBitmap", JniSkiaGraphiteView::getBitmap),
         makeNativeMethod("presentFrame", JniSkiaGraphiteView::presentFrame)});
  }

protected:
  void surfaceAvailable(jobject surface, int width, int height,
                        float pixelDensity, bool isSurface,
                        bool highBitDepth) override {
    JniSkiaBaseView::surfaceAvailable(surface, width, height, pixelDensity,
                                      isSurface, highBitDepth);
  }

  void surfaceSizeChanged(jobject surface, int width, int height,
                          float pixelDensity, bool isSurface,
                          bool highBitDepth) override {
    JniSkiaBaseView::surfaceSizeChanged(surface, width, height, pixelDensity,
                                        isSurface, highBitDepth);
  }

  void setPixelDensity(float pixelDensity) override {
    JniSkiaBaseView::setPixelDensity(pixelDensity);
  }

  void surfaceDestroyed() override { JniSkiaBaseView::surfaceDestroyed(); }

  void setDebugMode(bool show) override { JniSkiaBaseView::setDebugMode(show); }

  void registerView(int nativeId) override {
    JniSkiaBaseView::registerView(nativeId);
  }

  void unregisterView() override { JniSkiaBaseView::unregisterView(); }

  jni::local_ref<jni::JArrayInt> getBitmap(int width, int height) override {
    return JniSkiaBaseView::getBitmap(width, height);
  }

  // Choreographer tick: presents the queued recordings, returns whether more
  // are already waiting.
  bool presentFrame() { return getGraphiteView()->presentFrame(); }

private:
  friend HybridBase;

  explicit JniSkiaGraphiteView(
      jni::alias_ref<jhybridobject> jThis,
      jni::alias_ref<JniSkiaManager::javaobject> skiaManager)
      : JniSkiaBaseView(
            skiaManager,
            std::make_shared<RNSkAndroidView<RNSkia::RNSkGraphiteView>>(
                skiaManager->cthis()->getPlatformContext())) {
    // A submitted recording arms the Java view's frame callback. Weak: the
    // Java view owns this object through its hybrid data.
    jni::weak_ref<jhybridobject> weakJava = jni::make_weak(jThis);
    getGraphiteView()->setFrameScheduler([weakJava]() {
      auto javaPart = weakJava.lockLocal();
      if (!javaPart) {
        return;
      }
      static const auto method =
          javaPart->getClass()->getMethod<void()>("scheduleFrame");
      method(javaPart);
    });
  }

  std::shared_ptr<RNSkAndroidView<RNSkia::RNSkGraphiteView>> getGraphiteView() {
    return std::static_pointer_cast<RNSkAndroidView<RNSkia::RNSkGraphiteView>>(
        _skiaAndroidView);
  }
};

#else // SK_GRAPHITE

/**
 * Placeholder for builds without the Graphite backend: the component exists
 * so that the app links, but it renders nothing.
 */
class JniSkiaGraphiteView : public jni::HybridClass<JniSkiaGraphiteView> {
public:
  static auto constexpr kJavaDescriptor =
      "Lcom/reactnative/skia/SkiaGraphiteView;";

  static jni::local_ref<jhybriddata>
  initHybrid(jni::alias_ref<jhybridobject> jThis,
             jni::alias_ref<JniSkiaManager::javaobject> skiaManager) {
    static bool warned = false;
    if (!warned) {
      warned = true;
      RNSkLogger::logToConsole(
          "SkiaGraphiteView requires the Graphite backend. Rebuild with "
          "SK_GRAPHITE enabled; the view renders nothing.");
    }
    return makeCxxInstance();
  }

  static void registerNatives() {
    registerHybrid(
        {makeNativeMethod("initHybrid", JniSkiaGraphiteView::initHybrid),
         makeNativeMethod("surfaceAvailable",
                          JniSkiaGraphiteView::surfaceAvailable),
         makeNativeMethod("surfaceDestroyed",
                          JniSkiaGraphiteView::surfaceDestroyed),
         makeNativeMethod("surfaceSizeChanged",
                          JniSkiaGraphiteView::surfaceSizeChanged),
         makeNativeMethod("setPixelDensity",
                          JniSkiaGraphiteView::setPixelDensity),
         makeNativeMethod("setDebugMode", JniSkiaGraphiteView::setDebugMode),
         makeNativeMethod("registerView", JniSkiaGraphiteView::registerView),
         makeNativeMethod("unregisterView",
                          JniSkiaGraphiteView::unregisterView),
         makeNativeMethod("getBitmap", JniSkiaGraphiteView::getBitmap),
         makeNativeMethod("presentFrame", JniSkiaGraphiteView::presentFrame)});
  }

protected:
  void surfaceAvailable(jobject, int, int, float, bool, bool) {}
  void surfaceSizeChanged(jobject, int, int, float, bool, bool) {}
  void setPixelDensity(float) {}
  void surfaceDestroyed() {}
  void setDebugMode(bool) {}
  void registerView(int) {}
  void unregisterView() {}
  jni::local_ref<jni::JArrayInt> getBitmap(int, int) {
    return jni::JArrayInt::newArray(0);
  }
  bool presentFrame() { return false; }

private:
  friend HybridBase;
  JniSkiaGraphiteView() = default;
};

#endif // SK_GRAPHITE

} // namespace RNSkia
