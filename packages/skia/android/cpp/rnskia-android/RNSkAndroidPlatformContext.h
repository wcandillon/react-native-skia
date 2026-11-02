#pragma once

#include <exception>
#include <functional>
#include <memory>
#include <string>

#include "RNDawnContext.h"

#include "JniPlatformContext.h"
#include "JniSkiaPresentedImages.h"
#include "RNSkPlatformContext.h"
#include "RNSkWorker.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/ports/SkFontMgr_android.h"
#include "include/ports/SkFontScanner_FreeType.h"

#pragma clang diagnostic pop

namespace RNSkia {

/** A Java bitmap the image views draw (see RNSkPresentedImages). */
class AndroidPresentedBitmap : public PresentedBitmap {
public:
  explicit AndroidPresentedBitmap(jni::global_ref<JBitmap::javaobject> bitmap)
      : _bitmap(std::move(bitmap)) {}

  // The reference goes on whichever thread drops the last owner, which may
  // not be attached to the JVM.
  ~AndroidPresentedBitmap() override {
    jni::ThreadScope threadScope;
    _bitmap.reset();
  }

  void present(uint32_t id) override {
    JniSkiaPresentedImages::publish(id, _bitmap);
  }

private:
  jni::global_ref<JBitmap::javaobject> _bitmap;
};

/**
 A Java bitmap being written, its pixels locked until it is finished or let go
 of (see JniSkiaPresentedImages::makeBitmap).
 */
class AndroidPresentedBitmapWriter : public PresentedBitmapWriter {
public:
  explicit AndroidPresentedBitmapWriter(LockedBitmap locked)
      : PresentedBitmapWriter(locked.pixels),
        _bitmap(std::move(locked.bitmap)) {}

  // On whichever thread drops the last owner, which may not be attached to
  // the JVM.
  ~AndroidPresentedBitmapWriter() override {
    if (!_bitmap) {
      return;
    }
    JniSkiaPresentedImages::unlockBitmap(_bitmap, /* written= */ false);
    jni::ThreadScope threadScope;
    _bitmap.reset();
  }

  std::shared_ptr<PresentedBitmap> finish() override {
    JniSkiaPresentedImages::unlockBitmap(_bitmap, /* written= */ true);
    return std::make_shared<AndroidPresentedBitmap>(std::move(_bitmap));
  }

private:
  jni::global_ref<JBitmap::javaobject> _bitmap;
};

class RNSkAndroidPlatformContext : public RNSkPlatformContext {
public:
  RNSkAndroidPlatformContext(
      JniPlatformContext *jniPlatformContext,
      std::shared_ptr<facebook::react::CallInvoker> jsCallInvoker)
      : RNSkPlatformContext(std::move(jsCallInvoker),
                            jniPlatformContext->getPixelDensity()),
        _jniPlatformContext(jniPlatformContext) {
    // The worker calls into Java for every presented image and lets go of
    // Java references: attached once, for the thread's life, rather than
    // around every call.
    RNSkWorker::getInstance().post(
        []() { static thread_local jni::ThreadScope attached; });
  }

  ~RNSkAndroidPlatformContext() override = default;

  void performStreamOperation(
      const std::string &sourceUri,
      const std::function<void(std::unique_ptr<SkStreamAsset>)> &op) override {
    _jniPlatformContext->performStreamOperation(sourceUri, op);
  }

  void raiseError(const std::exception &err) override {
    _jniPlatformContext->raiseError(err);
  }

  sk_sp<SkSurface> makeOffscreenSurface(int width, int height,
                                        bool useP3ColorSpace = false) override {
    return DawnContext::getInstance().MakeOffscreen(width, height,
                                                    useP3ColorSpace);
  }

  sk_sp<SkFontMgr> createFontMgr() override {
    return SkFontMgr_New_Android(nullptr, SkFontScanner_Make_FreeType());
  }

  void runOnMainThread(std::function<void()> task) override {
    _jniPlatformContext->runTaskOnMainThread(std::move(task));
  }

  std::unique_ptr<PresentedBitmapWriter>
  makePresentedBitmap(const SkImageInfo &info) override {
    auto locked = JniSkiaPresentedImages::makeBitmap(info);
    if (!locked.bitmap) {
      return nullptr;
    }
    return std::make_unique<AndroidPresentedBitmapWriter>(std::move(locked));
  }

  void discardPresentedBitmap(uint32_t id) override {
    JniSkiaPresentedImages::discard(id);
  }

  // A hardware-accelerated canvas throws on a bitmap past 100 MB
  // (RecordingCanvas.MAX_BITMAP_SIZE).
  size_t getMaxPresentedBitmapBytes() override { return 100 * 1024 * 1024; }

private:
  JniPlatformContext *_jniPlatformContext;
};

} // namespace RNSkia
