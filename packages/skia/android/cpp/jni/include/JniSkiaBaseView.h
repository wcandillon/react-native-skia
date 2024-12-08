#pragma once

#include <memory>
#include <string>

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
      : _manager(skiaManager->cthis()), _skiaAndroidView(skiaView) {}

  ~JniSkiaBaseView() {}

  std::shared_ptr<RNSkManager> getSkiaManager() {
    return _manager->getSkiaManager();
  }

protected:
  virtual void surfaceAvailable(jobject surface, int width, int height,
                                bool opaque) {
    _skiaAndroidView->surfaceAvailable(surface, width, height, opaque);
  }

  virtual void surfaceSizeChanged(jobject surface, int width, int height,
                                  bool opaque) {
    _skiaAndroidView->surfaceSizeChanged(surface, width, height, opaque);
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
    getSkiaManager()->setSkiaView(
        _skiaAndroidView->getSkiaView()->getNativeId(), nullptr);
    getSkiaManager()->unregisterSkiaView(
        _skiaAndroidView->getSkiaView()->getNativeId());
  }

private:
  JniSkiaManager *_manager;
  std::shared_ptr<RNSkBaseAndroidView> _skiaAndroidView;
};

} // namespace RNSkia
