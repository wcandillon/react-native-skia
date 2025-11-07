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

#include <android/bitmap.h>
#include <android/native_window.h>
#include <android/native_window_jni.h>
#include <fbjni/detail/Hybrid.h>

#include "include/core/SkBitmap.h"
#include "include/core/SkCanvas.h"
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
         makeNativeMethod("unregisterView",
                          JniSkiaPictureView::unregisterView),
         makeNativeMethod("renderFirstFrame",
                          JniSkiaPictureView::renderFirstFrame)});
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

  void setDebugMode(bool show) override { JniSkiaBaseView::setDebugMode(show); }

  void registerView(int nativeId) override {
    JniSkiaBaseView::registerView(nativeId);
  }

  void unregisterView() override { JniSkiaBaseView::unregisterView(); }

  jobject renderFirstFrame(jint width, jint height) {
    // Create an offscreen surface for rendering
    auto imageInfo = SkImageInfo::MakeN32Premul(width, height);
    sk_sp<SkSurface> surface = SkSurfaces::Raster(imageInfo);

    if (!surface) {
      return nullptr;
    }

    SkCanvas* canvas = surface->getCanvas();
    canvas->clear(SK_ColorTRANSPARENT);

    // Get the picture view from base class
    auto skiaAndroidView = JniSkiaBaseView::getSkiaAndroidView();
    auto pictureView = std::static_pointer_cast<RNSkAndroidView<RNSkPictureView>>(skiaAndroidView);

    if (pictureView && pictureView->getSkiaView()) {
      auto renderer = std::static_pointer_cast<RNSkPictureRenderer>(
          pictureView->getSkiaView()->getRenderer());

      if (renderer) {
        // Create a temporary canvas provider for offscreen rendering
        class OffscreenCanvasProvider : public RNSkCanvasProvider {
        public:
          OffscreenCanvasProvider(SkCanvas* canvas)
            : RNSkCanvasProvider([](){}), _canvas(canvas) {}

          virtual ~OffscreenCanvasProvider() = default;

          bool renderToCanvas(const std::function<void(SkCanvas*)>& func) override {
            func(_canvas);
            return true;
          }

          int getWidth() override {
            return _canvas->imageInfo().width();
          }

          int getHeight() override {
            return _canvas->imageInfo().height();
          }

        private:
          SkCanvas* _canvas;
        };

        auto provider = std::make_shared<OffscreenCanvasProvider>(canvas);
        renderer->renderImmediate(provider);
      }
    }

    // Convert SkSurface to Android Bitmap
    SkBitmap bitmap;
    bitmap.allocPixels(imageInfo);
    surface->readPixels(bitmap, 0, 0);

    // Create Android Bitmap using JNI
    JNIEnv* env = jni::Environment::current();

    // Get Bitmap class and createBitmap method
    jclass bitmapClass = env->FindClass("android/graphics/Bitmap");
    jclass bitmapConfigClass = env->FindClass("android/graphics/Bitmap$Config");

    // Get ARGB_8888 config
    jfieldID argb8888FieldID = env->GetStaticFieldID(bitmapConfigClass, "ARGB_8888", "Landroid/graphics/Bitmap$Config;");
    jobject bitmapConfig = env->GetStaticObjectField(bitmapConfigClass, argb8888FieldID);

    // Create bitmap
    jmethodID createBitmapMethodID = env->GetStaticMethodID(bitmapClass, "createBitmap", "(IILandroid/graphics/Bitmap$Config;)Landroid/graphics/Bitmap;");
    jobject androidBitmap = env->CallStaticObjectMethod(bitmapClass, createBitmapMethodID, width, height, bitmapConfig);

    if (androidBitmap) {
      // Copy pixels to Android Bitmap
      AndroidBitmapInfo info;
      void* pixels;
      if (AndroidBitmap_getInfo(env, androidBitmap, &info) == 0 &&
          AndroidBitmap_lockPixels(env, androidBitmap, &pixels) == 0) {
        memcpy(pixels, bitmap.getPixels(), bitmap.computeByteSize());
        AndroidBitmap_unlockPixels(env, androidBitmap);
      }
    }

    // Clean up local references
    env->DeleteLocalRef(bitmapClass);
    env->DeleteLocalRef(bitmapConfigClass);

    return androidBitmap;
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
