#pragma once

#include <memory>

#include <android/native_window.h>
#include <android/native_window_jni.h>
#include <fbjni/fbjni.h>
#include <jni.h>

#include "JniSkiaManager.h"
#include "RNSkLog.h"
#include "RNSkView.h"
#include "RNSkWindowSurface.h"

namespace RNSkia {
namespace jni = facebook::jni;

/**
 * The JNI side of SkiaView: owns the native view and the window surface it
 * presents into, and relays the surface callbacks of the backing SurfaceView
 * or TextureView, whose ANativeWindow it acquires for the surface.
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
    attachWindow(surface, width, height, isSurface, highBitDepth);
    _view->redraw();
  }

  void surfaceSizeChanged(jobject surface, int width, int height,
                          bool isSurface, bool highBitDepth) {
    // Setting width/height to zero is nothing we need to care about when
    // it comes to invalidating the surface.
    if (width != 0 || height != 0) {
      if (_surface->isAttached()) {
        _surface->resize(width, height);
      } else {
        attachWindow(surface, width, height, isSurface, highBitDepth);
      }
    }
    // Paint the new size right away rather than on the next scheduled redraw.
    _view->redraw();
  }

  void surfaceDestroyed() { _surface->detach(); }

  /**
   The pixel size the backing view was laid out with. The surface it gets
   (SurfaceView or TextureView) has exactly this size, so a frame recorded
   before the surface exists already matches it. Main thread.
   */
  void setLayoutSize(int width, int height) {
    _surface->setLayoutSize(width, height);
  }

  void registerView(int nativeId) {
    auto manager = getSkiaManager();
    if (manager == nullptr) {
      return;
    }
    manager->registerSkiaView(nativeId, _view);
  }

  // React dropped the Java view. The Java side destroys this object right
  // after (SkiaView.dropInstance), and with it the native view and its
  // surface: their destructors give back the GPU memory the view holds. Left
  // to the garbage collector, that memory would wait for the Java object to
  // be finalized, which may never happen: the collector cannot see it.
  void unregisterView() {
    auto manager = getSkiaManager();
    if (manager == nullptr) {
      return;
    }
    manager->setSkiaView(_view->getNativeId(), nullptr);
    manager->unregisterSkiaView(_view->getNativeId());
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
    _surface = std::make_shared<RNSkWindowSurface>();
    _view = std::make_shared<RNSkView>(context, _surface);
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

  /**
   Takes the ANativeWindow behind an android.view.Surface (SurfaceView) or a
   SurfaceTexture (TextureView) and attaches it to the window surface, which
   gives it back through the releaser. Android never renders in Display P3.
   */
  void attachWindow(jobject surface, int width, int height, bool isSurface,
                    bool highBitDepth) {
    // Release the old surface and its window first.
    _surface->detach();
    JNIEnv *env = jni::Environment::current();
    jobject jSurface = surface;
    // The Surface created over a TextureView's SurfaceTexture; it lives as
    // long as the window and is released with it (a SurfaceView's Surface is
    // owned by the view).
    jobject ownedSurface = nullptr;
    if (!isSurface) {
      // A TextureView hands out its SurfaceTexture. The window is reached
      // through a Surface over it; that Surface is kept (and released) with
      // the window, otherwise it is only released by its finalizer.
      jclass surfaceClass = env->FindClass("android/view/Surface");
      jmethodID surfaceConstructor = env->GetMethodID(
          surfaceClass, "<init>", "(Landroid/graphics/SurfaceTexture;)V");
      jobject localSurface =
          env->NewObject(surfaceClass, surfaceConstructor, surface);
      ownedSurface = env->NewGlobalRef(localSurface);
      env->DeleteLocalRef(localSurface);
      env->DeleteLocalRef(surfaceClass);
      jSurface = ownedSurface;
    }
    // Acquires a reference on the window, given back by releaseWindow().
    ANativeWindow *window = ANativeWindow_fromSurface(env, jSurface);
    if (window == nullptr) {
      RNSkLogger::logToConsole("Could not acquire the native window");
      releaseWindow(nullptr, ownedSurface);
      return;
    }
    _surface->attach(window, width, height, highBitDepth,
                     /* useP3ColorSpace= */ false,
                     [ownedSurface](void *nativeHandle) {
                       releaseWindow(static_cast<ANativeWindow *>(nativeHandle),
                                     ownedSurface);
                     });
  }

  /**
   Gives back what attachWindow() took, once the Dawn surface drawing into the
   window is gone. Runs from RNSkWindowSurface::detach() or its destructor, so
   on any thread.
   */
  static void releaseWindow(ANativeWindow *window, jobject ownedSurface) {
    jni::ThreadScope threadScope;
    JNIEnv *env = jni::Environment::current();
    if (window != nullptr) {
      ANativeWindow_release(window);
    }
    if (ownedSurface != nullptr) {
      jclass surfaceClass = env->GetObjectClass(ownedSurface);
      jmethodID releaseMethod =
          env->GetMethodID(surfaceClass, "release", "()V");
      env->CallVoidMethod(ownedSurface, releaseMethod);
      env->DeleteLocalRef(surfaceClass);
      env->DeleteGlobalRef(ownedSurface);
    }
  }

  std::weak_ptr<RNSkManager> _manager;
  // Declared before the view, which unbinds itself from the surface when it
  // is destroyed.
  std::shared_ptr<RNSkWindowSurface> _surface;
  std::shared_ptr<RNSkView> _view;
};

} // namespace RNSkia
