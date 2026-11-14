#pragma once

#include <chrono>
#include <functional>
#include <memory>
#include <utility>

#include <android/native_window.h>
#include <android/native_window_jni.h>
#include <fbjni/fbjni.h>
#include <jni.h>

#include "JniPresentThread.h"
#include "JniSkiaManager.h"
#include "RNSkFrameSignal.h"
#include "RNSkLog.h"
#include "RNSkPresentThread.h"
#include "RNSkPresentThreadTimer.h"
#include "RNSkView.h"
#include "RNSkWindowSurface.h"
#include "rnsurface/FrameScheduler.h"

namespace RNSkia {
namespace jni = facebook::jni;

/**
 * The JNI side of SkiaView: owns the native view and the window surface it
 * presents into, and relays the surface callbacks of the backing SurfaceView
 * or TextureView, whose ANativeWindow it acquires for the surface. The view
 * presents on the present thread (see RNSkPresentThread.h), and the Java
 * view posts the surface callbacks there too, as the window belongs to that
 * thread (see RNSkWindowSurface); this object is destroyed there as well
 * (see SkiaView.dropInstance), so no call below runs under a present. The
 * view's frame scheduler (see rnsurface::FrameScheduler) gets its inputs
 * from here: the frame signals from the AChoreographer of the thread (see
 * FrameSignals), the polls for the GPU from a timer of the thread (see
 * PresentThreadTimer), and the TextureView's draws from the Java view.
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
   The pixel size the backing view was laid out with, and the density of that
   layout. The surface it gets (SurfaceView or TextureView) has exactly this
   size, so a frame recorded before the surface exists already matches it.
   The density changes along with the layout (a display density change lays
   the view out again), so frames keep the scale of the size they are
   recorded for. Main thread.
   */
  void setLayoutSize(int width, int height, float pixelDensity) {
    float previous = 0;
    bool known = _surface->getPixelDensity(&previous);
    _surface->setLayoutSize(width, height, pixelDensity);
    // A new size redraws once the surface follows it; a new density alone
    // does not change the surface.
    if (known && previous != pixelDensity) {
      _view->requestRedraw();
    }
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
    manager->unregisterSkiaView(_view->getNativeId());
  }

  // Present thread: the TextureView drew the frame it was given (see
  // SkiaView.onSurfaceTextureUpdated). This object is destroyed on that
  // thread too (see SkiaView.dropInstance), never under the call.
  void frameConsumed() { _view->onFrameConsumed(); }

  // Present thread: the view left its window, or the window lost its
  // surface (see SkiaView.cancelFrames). A frame signal already asked for
  // still fires, as AChoreographer has no cancel: it is dropped, or serves
  // a request made since (see FrameSignals::onSignal).
  void cancelScheduledFrames() { _view->cancelFrames(); }

private:
  friend HybridBase;

  explicit JniSkiaView(jni::alias_ref<jhybridobject> jThis,
                       jni::alias_ref<JniSkiaManager::javaobject> skiaManager)
      : _manager(skiaManager->cthis()->getSkiaManager()) {
    auto context = skiaManager->cthis()->getPlatformContext();
    _surface = std::make_shared<RNSkWindowSurface>();
    _view = std::make_shared<RNSkView>(context, _surface);
    // Tasks for the present thread go straight to it (see
    // RNSkPresentThread.h). The Java view, which is called back for its
    // frame rate vote, is reached through a weak reference: it owns this
    // object through its hybrid data.
    auto javaView = std::make_shared<JavaView>(jThis);
    auto runOnPresentThread = [](std::function<void()> task) {
      presentThread().post(std::move(task));
    };
    _view->setPresentThread(runOnPresentThread);
    // The entries of the view and its window that belong to the present
    // thread are bound to it there (see RNSkView::bindPresentThread), ahead
    // of the surface callbacks the Java view posts behind this: the thread
    // runs its tasks in order.
    runOnPresentThread([surface = _surface, view = _view]() {
      surface->bindPresentingThread();
      view->bindPresentThread();
    });
    // What the view's frame scheduler asks of the platform, on the present
    // thread (see RNSkView::FrameHost). Weak: the view may outlive this
    // object in the registry for a moment, and the timer's tasks the view.
    _frameSignals = std::make_shared<FrameSignals>(_view);
    std::weak_ptr<FrameSignals> weakSignals = _frameSignals;
    std::weak_ptr<RNSkView> weakView = _view;
    RNSkView::FrameHost host;
    host.requestFrameSignal = [weakSignals]() {
      if (auto signals = weakSignals.lock()) {
        signals->request();
      }
    };
    host.watchAcknowledgement = [weakView]() {
      PresentThreadTimer::getInstance().post(
          kAcknowledgementPoll, [weakView]() {
            if (auto view = weakView.lock()) {
              view->onAcknowledgementPoll();
            }
          });
    };
    // The Java view's frame rate vote (see SkiaView.onFramePresented). A
    // Java call from the native thread, which is attached (see
    // attachPresentThread). The local reference goes with the scope: no
    // Java frame is below to let go of it.
    host.onFramePresented = [javaView]() {
      callJavaFromPresentThread([&]() {
        jni::JniLocalScope localScope(jni::Environment::current(), 4);
        if (auto javaPart = javaView->weak->lockLocal()) {
          static const auto method =
              javaPart->getClass()->getMethod<void()>("onFramePresented");
          method(javaPart);
        }
      });
    };
    _view->setFrameHost(std::move(host));
  }

  // How often a view asks whether the GPU is done while its window holds a
  // frame for it (see RNSkWindowSurface::presentHeldFrame). Each poll asks a
  // fence and nothing else; a frame held is presented this late at most.
  static constexpr std::chrono::microseconds kAcknowledgementPoll{500};

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
   The frame signals of the view, on the present thread: the next frame of
   the display, from the thread's AChoreographer (its looper is the
   thread's, see rnsurface::RenderThread), with what that frame's timeline
   says of it (see FrameSignalSource).
   */
  class FrameSignals : public std::enable_shared_from_this<FrameSignals> {
  public:
    explicit FrameSignals(std::weak_ptr<RNSkView> view)
        : _view(std::move(view)) {}

    // A signal has no cancel, so one is outstanding at most: a request made
    // while the signal of a cancelled one is still to fire takes that
    // signal rather than a second, which would signal twice per frame from
    // then on. The token outlives this object, so a signal that fires after
    // it finds nothing.
    void request() {
      if (_pending) {
        return;
      }
      _pending = true;
      auto *token = new std::weak_ptr<FrameSignals>(weak_from_this());
      if (FrameSignalSource::post(onSignal, token)) {
        return;
      }
      // No connection to the display's events. The frame goes without a
      // signal of the display, as a task behind those queued, rather than
      // never: the scheduler holds its frames until the signal it asked for.
      if (!_loggedNoChoreographer) {
        _loggedNoChoreographer = true;
        RNSkLogger::logToConsole(
            "No AChoreographer on the present thread: presenting unpaced");
      }
      presentThread().post(
          [token]() { onSignal(FrameSignalSource::unpaced(), token); });
    }

  private:
    static void onSignal(const FrameSignalSource::FrameSignal &signal,
                         void *data) {
      auto *token = static_cast<std::weak_ptr<FrameSignals> *>(data);
      if (auto signals = token->lock()) {
        signals->_pending = false;
        auto view = signals->_view.lock();
        // Not asked for any more after a cancel: the scheduler hears of the
        // signals it asked for only.
        if (view != nullptr && view->wantsFrameSignal()) {
          view->onFrameSignal(signal);
        }
      }
      delete token;
    }

    std::weak_ptr<RNSkView> _view;
    // A signal was asked of the choreographer and has not fired. Present
    // thread, as the rest.
    bool _pending = false;
    bool _loggedNoChoreographer = false;
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
    // frames show in turn (see RNSkView::setWindow), and the scheduler paces
    // each its own way.
    _view->setWindow(
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
  std::shared_ptr<FrameSignals> _frameSignals;
};

} // namespace RNSkia
