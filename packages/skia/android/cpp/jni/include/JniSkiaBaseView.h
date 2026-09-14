#pragma once

#include <memory>
#include <string>
#include <vector>

#include <fbjni/fbjni.h>
#include <jni.h>
#include <jsi/jsi.h>

#include "JniSkiaManager.h"
#include "RNSkAndroidView.h"

#include <android/bitmap.h>

namespace RNSkia {

namespace jsi = facebook::jsi;

class JniSkiaBaseView {
public:
  JniSkiaBaseView(jni::alias_ref<JniSkiaManager::javaobject> skiaManager,
                  std::shared_ptr<RNSkBaseAndroidView> skiaView)
      : _skiaAndroidView(std::move(skiaView)), _manager(skiaManager->cthis()) {}

  ~JniSkiaBaseView() = default;

  std::shared_ptr<RNSkManager> getSkiaManager() {
    return _manager->getSkiaManager();
  }

protected:
  virtual void surfaceAvailable(jobject surface, int width, int height,
                                bool opaque, bool highBitDepth) {
    _skiaAndroidView->surfaceAvailable(surface, width, height, opaque,
                                       highBitDepth);
  }

  virtual void surfaceSizeChanged(jobject surface, int width, int height,
                                  bool opaque, bool highBitDepth) {
    _skiaAndroidView->surfaceSizeChanged(surface, width, height, opaque,
                                         highBitDepth);
  }

  virtual void surfaceDestroyed() { _skiaAndroidView->surfaceDestroyed(); }

  virtual void setDebugMode(bool show) {
    _skiaAndroidView->setShowDebugInfo(show);
  }

  virtual void registerView(int nativeId) {
    getSkiaManager()->registerSkiaView(nativeId,
                                       _skiaAndroidView->getSkiaView());
  }

  virtual void unregisterView() {
    auto manager = getSkiaManager();
    if (manager == nullptr || _skiaAndroidView == nullptr) {
      return;
    }
    auto skiaView = _skiaAndroidView->getSkiaView();
    if (skiaView == nullptr) {
      return;
    }
    manager->setSkiaView(skiaView->getNativeId(), nullptr);
    manager->unregisterSkiaView(skiaView->getNativeId());
  }

  virtual jni::local_ref<jni::JArrayInt> getBitmap(int width, int height) {
    return jni::JArrayInt::newArray(0);
  }

protected:
  std::shared_ptr<RNSkBaseAndroidView> _skiaAndroidView;

private:
  JniSkiaManager *_manager;
};

} // namespace RNSkia
