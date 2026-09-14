#pragma once

#include <cstdint>
#include <memory>
#include <string>
#include <vector>

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

#if defined(SK_GRAPHITE)
#include "RNDawnContext.h"
#else
#include "OpenGLContext.h"
#endif
#include "include/core/SkBitmap.h"
#include "include/core/SkCanvas.h"
#include "include/core/SkImage.h"
#include "include/core/SkPaint.h"
#include "include/core/SkPicture.h"
#include "include/core/SkPictureRecorder.h"
#include "include/core/SkSurface.h"

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
         makeNativeMethod("setDebugMode", JniSkiaPictureView::setDebugMode),
         makeNativeMethod("registerView", JniSkiaPictureView::registerView),
         makeNativeMethod("unregisterView", JniSkiaPictureView::unregisterView),
         makeNativeMethod("getBitmap", JniSkiaPictureView::getBitmap)});
  }

protected:
  void surfaceAvailable(jobject surface, int width, int height, bool opaque,
                        bool highBitDepth) override {
    JniSkiaBaseView::surfaceAvailable(surface, width, height, opaque,
                                      highBitDepth);
  }

  void surfaceSizeChanged(jobject surface, int width, int height, bool opaque,
                          bool highBitDepth) override {
    JniSkiaBaseView::surfaceSizeChanged(surface, width, height, opaque,
                                        highBitDepth);
  }

  void surfaceDestroyed() override { JniSkiaBaseView::surfaceDestroyed(); }

  void setDebugMode(bool show) override { JniSkiaBaseView::setDebugMode(show); }

  void registerView(int nativeId) override {
    JniSkiaBaseView::registerView(nativeId);
  }

  void unregisterView() override { JniSkiaBaseView::unregisterView(); }

  jni::local_ref<jni::JArrayInt> getBitmap(int width, int height) override {
    // Get the RNSkPictureView from the android view
    auto pictureView =
        std::static_pointer_cast<RNSkAndroidView<RNSkia::RNSkPictureView>>(
            _skiaAndroidView);
    if (!pictureView) {
      return JniSkiaBaseView::getBitmap(width, height);
    }

    // Get the renderer and cast it to RNSkPictureRenderer
    auto renderer = std::static_pointer_cast<RNSkia::RNSkPictureRenderer>(
        pictureView->getRenderer());
    if (!renderer) {
      return jni::JArrayInt::newArray(0);
    }

    // Get the SkPicture from the renderer
    sk_sp<SkPicture> picture = renderer->getPicture();

    const size_t pixelCount =
        static_cast<size_t>(width) * static_cast<size_t>(height);
    if (pixelCount == 0) {
      return jni::JArrayInt::newArray(0);
    }

    sk_sp<SkSurface> surface;
#if defined(SK_GRAPHITE)
    surface = DawnContext::getInstance().MakeOffscreen(width, height);
#else
    surface = OpenGLContext::getInstance().MakeOffscreen(width, height);
#endif

    if (!surface) {
      return jni::JArrayInt::newArray(0);
    }

    SkCanvas *canvas = surface->getCanvas();
    if (canvas == nullptr) {
      return jni::JArrayInt::newArray(0);
    }

    canvas->clear(SK_ColorTRANSPARENT);

    if (picture) {
      auto pd = pictureView->getPixelDensity();
      canvas->save();
      canvas->scale(pd, pd);
      canvas->drawPicture(picture);
      canvas->restore();
    }

    sk_sp<SkImage> snapshot = surface->makeImageSnapshot();
    if (!snapshot) {
      return jni::JArrayInt::newArray(0);
    }

    sk_sp<SkImage> image = snapshot->makeNonTextureImage();
    if (!image) {
      return jni::JArrayInt::newArray(0);
    }

    if (!image) {
      return jni::JArrayInt::newArray(0);
    }

    std::vector<int32_t> pixels(pixelCount);
    SkImageInfo readInfo = SkImageInfo::Make(
        width, height, kBGRA_8888_SkColorType, kPremul_SkAlphaType);
    size_t rowBytes = static_cast<size_t>(width) * sizeof(int32_t);
    if (!image->readPixels(nullptr, readInfo, pixels.data(), rowBytes, 0, 0)) {
      return jni::JArrayInt::newArray(0);
    }

    auto intArray = jni::JArrayInt::newArray(pixelCount);
    intArray->setRegion(0, pixelCount,
                        reinterpret_cast<const jint *>(pixels.data()));

    return intArray;
  }

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
