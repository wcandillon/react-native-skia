#pragma once

#include <memory>
#include <string>

#include <fbjni/fbjni.h>
#include <jni.h>
#include <jsi/jsi.h>

#include "JniSkiaBaseView.h"
#include "JniSkiaManager.h"
#include "RNSkAndroidView.h"
#include "RNSkPictureView.h"

#include <android/native_window.h>
#include <android/native_window_jni.h>
#include <fbjni/detail/Hybrid.h>

namespace RNSkia {
namespace jsi = facebook::jsi;
namespace jni = facebook::jni;

class JniSkiaPictureView : public jni::HybridClass<JniSkiaPictureView>,
                           public JniSkiaBaseView {
public:
  static auto constexpr kJavaDescriptor =
      "Lcom/shopify/reactnative/skia/SkiaPictureView;";

  static jni::local_ref<jhybriddata>
  initHybrid(jni::alias_ref<jhybridobject> jThis,
             jni::alias_ref<JniSkiaManager::javaobject> skiaManager) {
    return makeCxxInstance(jThis, skiaManager);
  }

  static void registerNatives() {
    registerHybrid(
        {makeNativeMethod("initHybrid", JniSkiaPictureView::initHybrid),
         makeNativeMethod("surfaceAvailable",
                          JniSkiaPictureView::surfaceAvailable),
         makeNativeMethod("surfaceDestroyed",
                          JniSkiaPictureView::surfaceDestroyed),
         makeNativeMethod("surfaceSizeChanged",
                          JniSkiaPictureView::surfaceSizeChanged),
         makeNativeMethod("registerView", JniSkiaPictureView::registerView),
         makeNativeMethod("unregisterView",
                          JniSkiaPictureView::unregisterView)});
  }

protected:
  void surfaceAvailable(jobject surface, int width, int height,
                        bool opaque) override {
    JniSkiaBaseView::surfaceAvailable(surface, width, height, opaque);
  }

  void surfaceSizeChanged(jobject surface, int width, int height,
                          bool opaque) override {
    JniSkiaBaseView::surfaceSizeChanged(surface, width, height, opaque);
  }

  void surfaceDestroyed() override { JniSkiaBaseView::surfaceDestroyed(); }


  void registerView(int nativeId) override {
    JniSkiaBaseView::registerView(nativeId);
  }

  void unregisterView() override { JniSkiaBaseView::unregisterView(); }

private:
  friend HybridBase;

  explicit JniSkiaPictureView(
      jni::alias_ref<jhybridobject> jThis,
      jni::alias_ref<JniSkiaManager::javaobject> skiaManager)
      : JniSkiaBaseView(
            skiaManager,
            std::make_shared<RNSkAndroidView<RNSkia::RNSkPictureView>>(
                skiaManager->cthis()->getPlatformContext())) {}

  jni::global_ref<javaobject> javaPart_;
};

} // namespace RNSkia
