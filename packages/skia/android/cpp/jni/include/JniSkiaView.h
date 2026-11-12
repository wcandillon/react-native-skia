#pragma once

#include <functional>
#include <memory>
#include <utility>

#include <android/choreographer.h>
#include <android/native_window.h>
#include <android/native_window_jni.h>
#include <fbjni/fbjni.h>
#include <jni.h>

#include "JniPresentThread.h"
#include "JniSkiaManager.h"
#include "RNSkLog.h"
#include "RNSkPresentThread.h"
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
 * frame scheduler lives here too (see rnsurface::FrameScheduler), with the
 * AChoreographer of the thread as its vsync (see PresentHost); the Java view
 * hands it the TextureView's draws.
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
         makeNativeMethod("nativeHasFrameToShow", JniSkiaView::hasFrameToShow),
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

  // Main thread: whether the view would present anything onto a window now
  // (see RNSkView::hasFrameToShow). A SurfaceView holds its window's draw
  // report for the first frame only when one is coming (see
  // FirstFrameDrawGate.onRedrawNeeded).
  bool hasFrameToShow() { return _view->hasFrameToShow(); }

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

  // Present thread: the TextureView drew the frame it was given (see
  // SkiaView.onSurfaceTextureUpdated). This object is destroyed on that
  // thread too (see SkiaView.dropInstance), never under the call.
  void frameConsumed() { _scheduler->onFrameConsumed(); }

  // Present thread: the view left its window, or the window lost its
  // surface (see SkiaView.cancelFrames). A vsync already asked for still
  // fires, as AChoreographer has no cancel: the host drops it, or hands it
  // to a request made since (see PresentHost::onVsync).
  void cancelScheduledFrames() { _scheduler->cancel(); }

private:
  friend HybridBase;

  explicit JniSkiaView(jni::alias_ref<jhybridobject> jThis,
                       jni::alias_ref<JniSkiaManager::javaobject> skiaManager)
      : _manager(skiaManager->cthis()->getSkiaManager()) {
    auto context = skiaManager->cthis()->getPlatformContext();
    _surface = std::make_shared<RNSkWindowSurface>();
    // The Java view, which is called back for its frame rate vote and for
    // the first frame of a SurfaceView's window, is reached through a weak
    // reference: it owns this object through its hybrid data, and the
    // surface is shared with the view and can outlive this object.
    auto javaView = std::make_shared<JavaView>(jThis);
    // The first frame presented into a SurfaceView's window, on the present
    // thread: the Java view opens its draw gate on the main thread. A Java
    // call from the native thread, which is attached (see
    // attachPresentThread), as in PresentHost::presentFrame.
    _surface->setDidPresent([javaView,
                             awaitingFirstFrame = _awaitingFirstFrame]() {
      if (!*awaitingFirstFrame) {
        return;
      }
      *awaitingFirstFrame = false;
      callJavaFromPresentThread([&]() {
        jni::JniLocalScope localScope(jni::Environment::current(), 4);
        if (auto javaPart = javaView->weak->lockLocal()) {
          static const auto method =
              javaPart->getClass()->getMethod<void()>("onFirstFramePresented");
          method(javaPart);
        }
      });
    });
    _view = std::make_shared<RNSkView>(context, _surface);
    // Tasks for the present thread go straight to it (see
    // RNSkPresentThread.h).
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
    // A submitted recording goes to the scheduler, on the present thread,
    // which arms the Java view's frame callback (or presents on the spot,
    // for a window resized since the frame it shows: see
    // rnsurface::FrameScheduler::requestFrame). Weak: the view may outlive
    // this object in the registry for a moment, with the scheduler gone.
    _presentHost = std::make_shared<PresentHost>(javaView, _view);
    _scheduler = std::make_shared<rnsurface::FrameScheduler>(*_presentHost);
    std::weak_ptr<rnsurface::FrameScheduler> weakScheduler = _scheduler;
    _presentHost->setScheduler(weakScheduler);
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
   from the thread's AChoreographer, the present from the native view, and
   the Java view told of a frame that went to the window, for its frame rate
   vote (see SkiaView.onFramePresented).
   */
  class PresentHost : public rnsurface::FrameScheduler::Host,
                      public std::enable_shared_from_this<PresentHost> {
  public:
    PresentHost(std::shared_ptr<JavaView> javaView,
                std::weak_ptr<RNSkView> view)
        : _javaView(std::move(javaView)), _view(std::move(view)) {}

    // The scheduler the vsync goes to; weak, as it goes before this object.
    void setScheduler(std::weak_ptr<rnsurface::FrameScheduler> scheduler) {
      _scheduler = std::move(scheduler);
    }

    // The next vsync, from the AChoreographer of the present thread (its
    // looper is the thread's, see rnsurface::RenderThread). A vsync has no
    // cancel, so one is outstanding at most: a request made while the vsync
    // of a cancelled one is still to fire takes that vsync rather than a
    // second, which would present twice per vsync from then on. The token
    // outlives this object, so a vsync that fires after it finds nothing.
    void postFrameCallback() override {
      if (_vsyncPending) {
        return;
      }
      _vsyncPending = true;
      auto *token = new std::weak_ptr<PresentHost>(weak_from_this());
      auto *choreographer = AChoreographer_getInstance();
      if (choreographer == nullptr) {
        // No connection to the display's events. The frame goes without a
        // vsync, as a task behind those queued, rather than never: the
        // scheduler holds its requests until the callback it asked for.
        if (!_loggedNoChoreographer) {
          _loggedNoChoreographer = true;
          RNSkLogger::logToConsole(
              "No AChoreographer on the present thread: presenting unpaced");
        }
        presentThread().post([token]() { onVsync(token); });
        return;
      }
      // The entry point of API 24: its frame time, a long, is not used.
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
      AChoreographer_postFrameCallback(
          choreographer, [](long, void *data) { onVsync(data); }, token);
#pragma clang diagnostic pop
    }

    static void onVsync(void *data) {
      auto *token = static_cast<std::weak_ptr<PresentHost> *>(data);
      if (auto host = token->lock()) {
        host->_vsyncPending = false;
        auto scheduler = host->_scheduler.lock();
        // Not asked for any more after a cancel: the scheduler presents on
        // the vsyncs it asked for only.
        if (scheduler != nullptr && scheduler->isFrameCallbackPosted()) {
          scheduler->onFrame();
        }
      }
      delete token;
    }

    int presentFrame() override {
      auto view = _view.lock();
      if (view == nullptr) {
        return rnsurface::FrameScheduler::kNothingPresented;
      }
      // The view reports in the scheduler's mask.
      const int result = view->presentFrame();
      if ((result & rnsurface::FrameScheduler::kPresented) != 0) {
        // A Java call from the native thread, which is attached (see
        // attachPresentThread). The local reference goes with the scope:
        // no Java frame is below to let go of it.
        callJavaFromPresentThread([&]() {
          jni::JniLocalScope localScope(jni::Environment::current(), 4);
          if (auto javaPart = _javaView->weak->lockLocal()) {
            static const auto method =
                javaPart->getClass()->getMethod<void()>("onFramePresented");
            method(javaPart);
          }
        });
      }
      return result;
    }

  private:
    std::shared_ptr<JavaView> _javaView;
    std::weak_ptr<RNSkView> _view;
    std::weak_ptr<rnsurface::FrameScheduler> _scheduler;
    // A vsync was asked of the choreographer and has not fired. Present
    // thread, as the rest.
    bool _vsyncPending = false;
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
    // A SurfaceView waits for its first frame before it lets the window show
    // the surface (SkiaSurfaceView.surfaceRedrawNeededAsync).
    *_awaitingFirstFrame = isSurface;
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
  // Set when a SurfaceView's window is attached, cleared by its first present
  // (see attachWindow, setDidPresent). Present thread, and shared with the
  // surface, which can outlive this object.
  std::shared_ptr<bool> _awaitingFirstFrame = std::make_shared<bool>(false);
  // Declared before the view, which unbinds itself from the surface when it
  // is destroyed.
  std::shared_ptr<RNSkWindowSurface> _surface;
  std::shared_ptr<RNSkView> _view;
  // The host outlives the scheduler, which refers to it.
  std::shared_ptr<PresentHost> _presentHost;
  std::shared_ptr<rnsurface::FrameScheduler> _scheduler;
};

} // namespace RNSkia
