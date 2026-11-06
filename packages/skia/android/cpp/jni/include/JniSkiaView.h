#pragma once

#include <functional>
#include <memory>
#include <utility>

#include <android/native_window.h>
#include <android/native_window_jni.h>
#include <fbjni/NativeRunnable.h>
#include <fbjni/fbjni.h>
#include <jni.h>

#include "JniSkiaManager.h"
#include "RNSkLog.h"
#include "RNSkView.h"
#include "RNSkWindowSurface.h"
#include "rnsurface/FrameScheduler.h"

namespace RNSkia {
namespace jni = facebook::jni;

/**
 * The JNI side of SkiaView: owns the native view and the window surface it
 * presents into, and relays the surface callbacks of the backing SurfaceView
 * or TextureView, whose ANativeWindow it acquires for the surface. The view
 * presents on the present thread of the Java side (see
 * SkiaView.runOnPresentThread), and the Java view posts the surface
 * callbacks there too, as the window belongs to that thread (see
 * RNSkWindowSurface); this object is destroyed there as well (see
 * SkiaView.dropInstance), so no call below runs under a present. The frame
 * scheduler lives here too (see rnsurface::FrameScheduler): the Java view
 * hands it the vsync of its Choreographer and the TextureView's draws, and
 * arms the Choreographer when the scheduler asks (see PresentHost).
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
         makeNativeMethod("surfaceAbandoned", JniSkiaView::surfaceAbandoned),
         makeNativeMethod("surfaceSizeChanged",
                          JniSkiaView::surfaceSizeChanged),
         makeNativeMethod("setLayoutSize", JniSkiaView::setLayoutSize),
         makeNativeMethod("setSurfaceHighBitDepth",
                          JniSkiaView::setSurfaceHighBitDepth),
         makeNativeMethod("registerView", JniSkiaView::registerView),
         makeNativeMethod("unregisterView", JniSkiaView::unregisterView),
         makeNativeMethod("frameCallback", JniSkiaView::frameCallback),
         makeNativeMethod("frameConsumed", JniSkiaView::frameConsumed),
         makeNativeMethod("cancelScheduledFrames",
                          JniSkiaView::cancelScheduledFrames)});
  }

  // The manager is owned by the RNSkiaModule and is destroyed when the module
  // is invalidated (reload). Fabric drops views on the UI thread while the
  // module is invalidated on a background thread, so a view can outlive its
  // manager: holding a weak reference makes a late unregister a no-op and a
  // concurrent one keep the manager alive for the duration of the call.
  std::shared_ptr<RNSkManager> getSkiaManager() { return _manager.lock(); }

protected:
  // Present thread. Attaching the window asks the view for a frame, posted
  // behind this call.
  void surfaceAvailable(jobject surface, int width, int height, bool isSurface,
                        bool highBitDepth) {
    attachWindow(surface, width, height, isSurface, highBitDepth);
  }

  // Present thread. The window follows the new size by the next present of a
  // frame made for it, which the surface asks for.
  void surfaceSizeChanged(jobject surface, int width, int height,
                          bool isSurface, bool highBitDepth) {
    // Setting width/height to zero is nothing we need to care about when
    // it comes to invalidating the surface.
    if (width == 0 && height == 0) {
      return;
    }
    if (_surface->isAttached()) {
      _surface->resize(width, height);
    } else {
      attachWindow(surface, width, height, isSurface, highBitDepth);
    }
  }

  // Present thread, before the platform destroys the window: lets go of it
  // (see RNSkWindowSurface::detach).
  void surfaceDestroyed() { _surface->detach(); }

  // Main thread, as the platform is about to destroy the window, which it
  // does without waiting for surfaceDestroyed() to run on the present thread
  // (see SkiaView.onSurfaceDestroyed): nothing is presented onto it from here
  // until then (see RNSkWindowSurface::abandon).
  void surfaceAbandoned() { _surface->abandon(); }

  /**
   The pixel size the backing view was laid out with. The surface it gets
   (SurfaceView or TextureView) has exactly this size, so a frame recorded
   before the surface exists already matches it. Main thread.
   */
  void setLayoutSize(int width, int height) {
    _surface->setLayoutSize(width, height);
  }

  /**
   The bit depth the backing view was created with, which its surface gets
   (see SkiaView.updateView), so that a frame recorded before the surface
   exists, or while it is away, is recorded for its format. Main thread.
   */
  void setSurfaceHighBitDepth(bool highBitDepth) {
    _surface->setHighBitDepth(highBitDepth);
  }

  void registerView(int nativeId) {
    auto manager = getSkiaManager();
    if (manager == nullptr) {
      return;
    }
    manager->registerSkiaView(nativeId, _view);
  }

  // Main thread: React dropped the Java view. The Java side destroys this
  // object right after, on the present thread (SkiaView.dropInstance), and
  // with it the native view and its surface: their destructors give back the
  // GPU memory the view holds. Left to the garbage collector, that memory
  // would wait for the Java object to be finalized, which may never happen:
  // the collector cannot see it.
  void unregisterView() {
    auto manager = getSkiaManager();
    if (manager == nullptr) {
      return;
    }
    manager->setSkiaView(_view->getNativeId(), nullptr);
    manager->unregisterSkiaView(_view->getNativeId());
  }

  // Present thread: the vsync the scheduler asked the Java view for (see
  // SkiaView.postFrameCallback, doFrame). This object is destroyed on that
  // thread too (see SkiaView.dropInstance), never under the call.
  void frameCallback() { _scheduler->onFrame(); }

  // Present thread: the TextureView drew the frame it was given (see
  // SkiaView.onSurfaceTextureUpdated).
  void frameConsumed() { _scheduler->onFrameConsumed(); }

  // Present thread: the view left its window, or the window lost its
  // surface, and the Java view removed its callbacks (see
  // SkiaView.cancelFrames).
  void cancelScheduledFrames() { _scheduler->cancel(); }

private:
  friend HybridBase;

  explicit JniSkiaView(jni::alias_ref<jhybridobject> jThis,
                       jni::alias_ref<JniSkiaManager::javaobject> skiaManager)
      : _manager(skiaManager->cthis()->getSkiaManager()) {
    auto context = skiaManager->cthis()->getPlatformContext();
    _surface = std::make_shared<RNSkWindowSurface>();
    _view = std::make_shared<RNSkView>(context, _surface);
    // Tasks for the present thread go through the Java view, which owns the
    // thread. Weak: the Java view owns this object through its hybrid data;
    // a task for a view that is gone is dropped. Called from any thread, the
    // render thread pool's included, hence the thread scope.
    auto javaView = std::make_shared<JavaView>(jThis);
    _view->setPresentThread([javaView](std::function<void()> task) {
      jni::ThreadScope threadScope;
      auto javaPart = javaView->weak->lockLocal();
      if (!javaPart) {
        return;
      }
      static const auto method =
          javaPart->getClass()
              ->getMethod<void(jni::alias_ref<jni::JRunnable::javaobject>)>(
                  "runOnPresentThread");
      method(javaPart, jni::JNativeRunnable::newObjectCxxArgs(std::move(task)));
    });
    // A submitted recording goes to the scheduler, on the present thread,
    // which arms the Java view's frame callback (or presents on the spot,
    // for a window resized since the frame it shows: see
    // rnsurface::FrameScheduler::requestFrame). Weak: the view may outlive
    // this object in the registry for a moment, with the scheduler gone.
    _presentHost = std::make_shared<PresentHost>(javaView, _view);
    _scheduler = std::make_shared<rnsurface::FrameScheduler>(*_presentHost);
    std::weak_ptr<rnsurface::FrameScheduler> weakScheduler = _scheduler;
    _view->setFrameScheduler([weakScheduler](bool forResizedWindow) {
      if (auto scheduler = weakScheduler.lock()) {
        scheduler->requestFrame(forResizedWindow);
      }
    });
  }

  /**
   A weak reference to the Java view for the callbacks the native view hands
   out, which are copied and destroyed on whichever thread holds them last
   (the target copies the frame request on the render thread that submits a
   recording). A JNI reference needs the thread attached to the JVM to be
   made or let go of, which such a thread is not: the callbacks share one,
   made here and released under a thread scope.
   */
  struct JavaView {
    explicit JavaView(jni::alias_ref<jhybridobject> jThis)
        : weak(std::make_unique<jni::weak_ref<jhybridobject>>(
              jni::make_weak(jThis))) {}
    ~JavaView() {
      jni::ThreadScope threadScope;
      weak.reset();
    }
    std::unique_ptr<jni::weak_ref<jhybridobject>> weak;
  };

  /**
   What the scheduler asks of the view, on the present thread: the vsync
   from the Java view's Choreographer (see SkiaView.postFrameCallback), the
   present from the native view, and the Java view told of a frame that
   went to the window, for its frame rate vote (see
   SkiaView.onFramePresented).
   */
  class PresentHost : public rnsurface::FrameScheduler::Host {
  public:
    PresentHost(std::shared_ptr<JavaView> javaView,
                std::weak_ptr<RNSkView> view)
        : _javaView(std::move(javaView)), _view(std::move(view)) {}

    void postFrameCallback() override {
      auto javaPart = _javaView->weak->lockLocal();
      if (!javaPart) {
        return;
      }
      static const auto method =
          javaPart->getClass()->getMethod<void()>("postFrameCallback");
      method(javaPart);
    }

    int presentFrame() override {
      auto view = _view.lock();
      if (view == nullptr) {
        return rnsurface::FrameScheduler::kNothingPresented;
      }
      static_assert(RNSkView::kFramePresented ==
                        rnsurface::FrameScheduler::kPresented,
                    "the view and the scheduler agree on the result mask");
      static_assert(RNSkView::kMoreQueued ==
                        rnsurface::FrameScheduler::kMoreQueued,
                    "the view and the scheduler agree on the result mask");
      const int result = view->presentFrame();
      if ((result & RNSkView::kFramePresented) != 0) {
        if (auto javaPart = _javaView->weak->lockLocal()) {
          static const auto method =
              javaPart->getClass()->getMethod<void()>("onFramePresented");
          method(javaPart);
        }
      }
      return result;
    }

  private:
    std::shared_ptr<JavaView> _javaView;
    std::weak_ptr<RNSkView> _view;
  };

  /**
   Takes the ANativeWindow behind an android.view.Surface (SurfaceView) or a
   SurfaceTexture (TextureView) and attaches it to the window surface, which
   gives it back through the releaser. Android never renders in Display P3.
   */
  void attachWindow(jobject surface, int width, int height, bool isSurface,
                    bool highBitDepth) {
    // The previous window, if any, goes as the new one attaches (see
    // RNSkWindowSurface::attach); not detach(), which would take down an
    // abandon the main thread sets while this runs.
    // A TextureView draws the latest frame presented to it; a SurfaceView's
    // frames show in turn (see RNSkView::setWindowTakesLatestFrame), and the
    // scheduler paces each its own way.
    _view->setWindowTakesLatestFrame(!isSurface);
    _scheduler->setWindow(
        isSurface ? rnsurface::FrameScheduler::Window::kShowsEachFrame
                  : rnsurface::FrameScheduler::Window::kShowsLatestFrame);
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
   window is gone. Runs from RNSkWindowSurface::detach() on the present
   thread, or from its destructor, so on any thread.
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
  // The host outlives the scheduler, which refers to it.
  std::shared_ptr<PresentHost> _presentHost;
  std::shared_ptr<rnsurface::FrameScheduler> _scheduler;
};

} // namespace RNSkia
