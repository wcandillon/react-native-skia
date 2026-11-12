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
      : _skiaAndroidView(std::move(skiaView)),
        _manager(skiaManager->cthis()->getSkiaManager()) {}

  ~JniSkiaBaseView() = default;

  // The manager is owned by the RNSkiaModule and is destroyed when the module
  // is invalidated (reload). Fabric drops views on the UI thread while the
  // module is invalidated on a background thread, so a view can outlive its
  // manager: holding a weak reference makes a late unregister a no-op and a
  // concurrent one keep the manager alive for the duration of the call.
  std::shared_ptr<RNSkManager> getSkiaManager() { return _manager.lock(); }

protected:
  virtual void surfaceAvailable(jobject surface, int width, int height,
                                float pixelDensity, bool isSurface,
                                bool highBitDepth) {
    _skiaAndroidView->surfaceAvailable(surface, width, height, pixelDensity,
                                       isSurface, highBitDepth);
  }

  virtual void surfaceSizeChanged(jobject surface, int width, int height,
                                  float pixelDensity, bool isSurface,
                                  bool highBitDepth) {
    _skiaAndroidView->surfaceSizeChanged(surface, width, height, pixelDensity,
                                         isSurface, highBitDepth);
  }

  virtual void setPixelDensity(float pixelDensity) {
    _skiaAndroidView->setPixelDensity(pixelDensity);
  }

  virtual void surfaceDestroyed() { _skiaAndroidView->surfaceDestroyed(); }

  virtual void setDebugMode(bool show) {
    _skiaAndroidView->setShowDebugInfo(show);
  }

  virtual void registerView(int nativeId) {
    auto manager = getSkiaManager();
    if (manager == nullptr) {
      return;
    }
    manager->registerSkiaView(nativeId, _skiaAndroidView->getSkiaView());
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
  std::weak_ptr<RNSkManager> _manager;
};

} // namespace RNSkia
