#pragma once

#include <memory>

#include <fbjni/fbjni.h>
#include <jni.h>

#include "JniSkiaManager.h"
#include "RNSkAndroidCanvasProvider.h"
#include "RNSkView.h"

namespace RNSkia {
namespace jni = facebook::jni;

/**
 * The JNI side of SkiaView: owns the native view and the ANativeWindow
 * provider it presents into, and relays the surface callbacks of the backing
 * SurfaceView or TextureView.
 */
class JniSkiaView : public jni::HybridClass<JniSkiaView> {
public:
  static auto constexpr kJavaDescriptor = "Lcom/reactnative/skia/SkiaView;";

  static jni::local_ref<jhybriddata>
  initHybrid(jni::alias_ref<jhybridobject> jThis,
             jni::alias_ref<JniSkiaManager::javaobject> skiaManager) {
    return makeCxxInstance(jThis, skiaManager);
  }

  static void registerNatives() {
    registerHybrid(
        {makeNativeMethod("initHybrid", JniSkiaView::initHybrid),
         makeNativeMethod("surfaceAvailable", JniSkiaView::surfaceAvailable),
         makeNativeMethod("surfaceDestroyed", JniSkiaView::surfaceDestroyed),
         makeNativeMethod("surfaceSizeChanged",
                          JniSkiaView::surfaceSizeChanged),
         makeNativeMethod("setLayoutSize", JniSkiaView::setLayoutSize),
         makeNativeMethod("registerView", JniSkiaView::registerView),
         makeNativeMethod("unregisterView", JniSkiaView::unregisterView),
         makeNativeMethod("presentFrame", JniSkiaView::presentFrame)});
  }

  // The manager is owned by the RNSkiaModule and is destroyed when the module
  // is invalidated (reload). Fabric drops views on the UI thread while the
  // module is invalidated on a background thread, so a view can outlive its
  // manager: holding a weak reference makes a late unregister a no-op and a
  // concurrent one keep the manager alive for the duration of the call.
  std::shared_ptr<RNSkManager> getSkiaManager() { return _manager.lock(); }

protected:
  void surfaceAvailable(jobject surface, int width, int height, bool isSurface,
                        bool highBitDepth) {
    _provider->surfaceAvailable(surface, width, height, isSurface,
                                highBitDepth);
    _view->redraw();
  }

  void surfaceSizeChanged(jobject surface, int width, int height,
                          bool isSurface, bool highBitDepth) {
    _provider->surfaceSizeChanged(surface, width, height, isSurface,
                                  highBitDepth);
    // Paint the new size right away rather than on the next scheduled redraw.
    _view->redraw();
  }

  void surfaceDestroyed() { _provider->surfaceDestroyed(); }

  void setLayoutSize(int width, int height) {
    _provider->setLayoutSize(width, height);
  }

  void registerView(int nativeId) {
    auto manager = getSkiaManager();
    if (manager == nullptr) {
      return;
    }
    manager->registerSkiaView(nativeId, _view);
  }

  void unregisterView() {
    if (auto manager = getSkiaManager()) {
      manager->setSkiaView(_view->getNativeId(), nullptr);
      manager->unregisterSkiaView(_view->getNativeId());
    }
    // React drops the Java view here, but the native view behind it (and the
    // content it owns) is only destroyed when the Java object is finalized.
    // Release the content now so it does not wait for the garbage collector.
    _view->releaseContent();
  }

  // Choreographer tick: presents the queued recordings, returns whether more
  // are already waiting.
  bool presentFrame() { return _view->presentFrame(); }

private:
  friend HybridBase;

  explicit JniSkiaView(jni::alias_ref<jhybridobject> jThis,
                       jni::alias_ref<JniSkiaManager::javaobject> skiaManager)
      : _manager(skiaManager->cthis()->getSkiaManager()) {
    auto context = skiaManager->cthis()->getPlatformContext();
    _provider = std::make_shared<RNSkAndroidCanvasProvider>(context);
    _view = std::make_shared<RNSkView>(context, _provider);
    // A submitted recording arms the Java view's frame callback. Weak: the
    // Java view owns this object through its hybrid data.
    jni::weak_ref<jhybridobject> weakJava = jni::make_weak(jThis);
    _view->setFrameScheduler([weakJava]() {
      auto javaPart = weakJava.lockLocal();
      if (!javaPart) {
        return;
      }
      static const auto method =
          javaPart->getClass()->getMethod<void()>("scheduleFrame");
      method(javaPart);
    });
  }

  std::weak_ptr<RNSkManager> _manager;
  std::shared_ptr<RNSkAndroidCanvasProvider> _provider;
  std::shared_ptr<RNSkView> _view;
};

} // namespace RNSkia
