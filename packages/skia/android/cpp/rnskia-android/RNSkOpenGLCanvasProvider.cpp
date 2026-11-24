#include "RNSkOpenGLCanvasProvider.h"

#include <android/native_window_jni.h>
#include <fbjni/fbjni.h>
#include <jni.h>
#include <memory>

#include "RNSkLog.h"

#if defined(SK_GRAPHITE)
#include "RNDawnContext.h"
#else
#include "OpenGLContext.h"
#endif

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkCanvas.h"
#include "include/core/SkSurface.h"

#pragma clang diagnostic pop

namespace RNSkia {

RNSkOpenGLCanvasProvider::RNSkOpenGLCanvasProvider(
    std::function<void()> requestRedraw,
    std::shared_ptr<RNSkia::RNSkPlatformContext> platformContext)
    : RNSkCanvasProvider(std::move(requestRedraw)),
      _platformContext(std::move(platformContext)) {}

RNSkOpenGLCanvasProvider::~RNSkOpenGLCanvasProvider() {
  _surfaceHolder = nullptr;
  releaseWindow();
}

int RNSkOpenGLCanvasProvider::getWidth() {
  if (_surfaceHolder) {
    return _surfaceHolder->getWidth();
  }
  return 0;
}

int RNSkOpenGLCanvasProvider::getHeight() {
  if (_surfaceHolder) {
    return _surfaceHolder->getHeight();
  }
  return 0;
}

ANativeWindow *RNSkOpenGLCanvasProvider::acquireWindow(jobject surface,
                                                       bool isSurface) {
  JNIEnv *env = facebook::jni::Environment::current();
  jobject jSurface = surface;
  if (!isSurface) {
    // A TextureView hands out its SurfaceTexture. The window is reached
    // through a Surface over it; that Surface is kept (and released) with the
    // window, otherwise it is only released by its finalizer.
    jclass surfaceClass = env->FindClass("android/view/Surface");
    jmethodID surfaceConstructor = env->GetMethodID(
        surfaceClass, "<init>", "(Landroid/graphics/SurfaceTexture;)V");
    jobject localSurface =
        env->NewObject(surfaceClass, surfaceConstructor, surface);
    _jSurface = env->NewGlobalRef(localSurface);
    env->DeleteLocalRef(localSurface);
    env->DeleteLocalRef(surfaceClass);
    jSurface = _jSurface;
#if !defined(SK_GRAPHITE)
    _jSurfaceTexture = env->NewGlobalRef(surface);
    jclass surfaceTextureClass = env->GetObjectClass(surface);
    _updateTexImageMethod =
        env->GetMethodID(surfaceTextureClass, "updateTexImage", "()V");
    env->DeleteLocalRef(surfaceTextureClass);
#endif
  }
  // Acquires a reference on the window, given back by releaseWindow().
  _window = ANativeWindow_fromSurface(env, jSurface);
  return _window;
}

void RNSkOpenGLCanvasProvider::releaseWindow() {
  if (_window == nullptr && _jSurface == nullptr) {
    return;
  }
  // The destructor can run on any thread.
  facebook::jni::ThreadScope threadScope;
  JNIEnv *env = facebook::jni::Environment::current();
  if (_window != nullptr) {
    ANativeWindow_release(_window);
    _window = nullptr;
  }
  if (_jSurface != nullptr) {
    jclass surfaceClass = env->GetObjectClass(_jSurface);
    jmethodID releaseMethod = env->GetMethodID(surfaceClass, "release", "()V");
    env->CallVoidMethod(_jSurface, releaseMethod);
    env->DeleteLocalRef(surfaceClass);
    env->DeleteGlobalRef(_jSurface);
    _jSurface = nullptr;
  }
#if !defined(SK_GRAPHITE)
  if (_jSurfaceTexture != nullptr) {
    env->DeleteGlobalRef(_jSurfaceTexture);
    _jSurfaceTexture = nullptr;
    _updateTexImageMethod = nullptr;
  }
#endif
}

#if !defined(SK_GRAPHITE)
void RNSkOpenGLCanvasProvider::updateTexImage() {
  if (_jSurfaceTexture) {
    JNIEnv *env = facebook::jni::Environment::current();
    env->CallVoidMethod(_jSurfaceTexture, _updateTexImageMethod);

    // Check for exceptions
    if (env->ExceptionCheck()) {
      RNSkLogger::logToConsole("updateAndRelease() failed. The exception above "
                               "can safely be ignored");
      env->ExceptionClear();
    }

    // updateTexImage() can change the GL_TEXTURE_EXTERNAL_OES binding of the
    // current context behind Ganesh's texture-binding cache. Without this
    // reset, re-drawing an already imported external image (e.g.
    // MakeImageFromNativeBuffer) hits the stale cache, skips glBindTexture and
    // samples the wrong texture. Contexts that never imported such an image
    // have no external texture to protect and skip the reset.
    auto &glContext = OpenGLContext::getInstance();
    auto *directContext = glContext.getDirectContext();
    if (directContext != nullptr && glContext.hasImportedExternalTexture()) {
      directContext->resetContext(kTextureBinding_GrGLBackendState);
    }
  }
}
#endif

#if defined(SK_GRAPHITE)
void RNSkOpenGLCanvasProvider::updateTargetInfo() {
  std::lock_guard<std::mutex> lock(_targetInfoMutex);
  if (_surfaceHolder == nullptr) {
    _hasTargetInfo = false;
    return;
  }
  auto *window = static_cast<DawnWindowContext *>(_surfaceHolder.get());
  _targetInfo.width = window->getWidth();
  _targetInfo.height = window->getHeight();
  _targetInfo.colorType = window->getColorType();
  _targetInfo.textureInfo = window->getTextureInfo();
  _hasTargetInfo = true;
}

bool RNSkOpenGLCanvasProvider::getGraphiteTargetInfo(
    RNSkGraphiteTargetInfo *info) {
  std::lock_guard<std::mutex> lock(_targetInfoMutex);
  if (!_hasTargetInfo) {
    return false;
  }
  *info = _targetInfo;
  return true;
}

bool RNSkOpenGLCanvasProvider::presentRecordings(
    const std::vector<skgpu::graphite::Recording *> &recordings) {
  if (_surfaceHolder == nullptr) {
    return false;
  }
  return static_cast<DawnWindowContext *>(_surfaceHolder.get())
      ->presentRecordings(recordings);
}
#endif

bool RNSkOpenGLCanvasProvider::renderToCanvas(
    const std::function<void(SkCanvas *)> &cb) {
  if (_surfaceHolder != nullptr && cb != nullptr) {
    // Get the surface
    auto surface = _surfaceHolder->getSurface();
#if !defined(SK_GRAPHITE)
    updateTexImage();
#endif
    if (surface) {
      // Draw into canvas using callback
      cb(surface->getCanvas());
      // Swap buffers and show on screen
      _surfaceHolder->present();
      return true;
    } else {
      // the render context did not provide a surface
      return false;
    }
  }
  return false;
}

void RNSkOpenGLCanvasProvider::surfaceAvailable(jobject surface, int width,
                                                int height, bool isSurface,
                                                bool highBitDepth) {
  // Release the old surface and its window
  _surfaceHolder = nullptr;
  releaseWindow();

  ANativeWindow *window = acquireWindow(surface, isSurface);
  if (window == nullptr) {
    RNSkLogger::logToConsole("Could not acquire the native window");
    releaseWindow();
    return;
  }
#if defined(SK_GRAPHITE)
  _surfaceHolder = DawnContext::getInstance().MakeWindow(window, width, height,
                                                         highBitDepth);
  updateTargetInfo();
#else
  _surfaceHolder =
      OpenGLContext::getInstance().MakeWindow(window, highBitDepth);
#endif

  // Post redraw request to ensure we paint in the next draw cycle.
  _requestRedraw();
}

void RNSkOpenGLCanvasProvider::surfaceDestroyed() {
  // destroy the renderer (a unique pointer so the dtor will be called
  // immediately.)
  _surfaceHolder = nullptr;
#if defined(SK_GRAPHITE)
  updateTargetInfo();
#endif
  releaseWindow();
}

void RNSkOpenGLCanvasProvider::surfaceSizeChanged(jobject jSurface, int width,
                                                  int height, bool isSurface,
                                                  bool highBitDepth) {
  if (width == 0 && height == 0) {
    // Setting width/height to zero is nothing we need to care about when
    // it comes to invalidating the surface.
    return;
  }

  if (_surfaceHolder == nullptr) {
    surfaceAvailable(jSurface, width, height, isSurface, highBitDepth);
  } else {
    _surfaceHolder->resize(width, height);
#if defined(SK_GRAPHITE)
    updateTargetInfo();
#endif
  }

  // Redraw after size change
  _requestRedraw();
}
} // namespace RNSkia
