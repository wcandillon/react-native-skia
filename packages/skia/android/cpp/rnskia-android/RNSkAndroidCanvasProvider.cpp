#include "RNSkAndroidCanvasProvider.h"

#include <android/native_window_jni.h>
#include <fbjni/fbjni.h>
#include <jni.h>
#include <memory>

#include "RNDawnContext.h"
#include "RNSkLog.h"

namespace RNSkia {

RNSkAndroidCanvasProvider::RNSkAndroidCanvasProvider(
    std::shared_ptr<RNSkPlatformContext> platformContext)
    : _platformContext(std::move(platformContext)) {}

RNSkAndroidCanvasProvider::~RNSkAndroidCanvasProvider() {
  _surfaceHolder = nullptr;
  releaseWindow();
}

int RNSkAndroidCanvasProvider::getWidth() {
  if (_surfaceHolder) {
    return _surfaceHolder->getWidth();
  }
  return 0;
}

int RNSkAndroidCanvasProvider::getHeight() {
  if (_surfaceHolder) {
    return _surfaceHolder->getHeight();
  }
  return 0;
}

ANativeWindow *RNSkAndroidCanvasProvider::acquireWindow(jobject surface,
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
  }
  // Acquires a reference on the window, given back by releaseWindow().
  _window = ANativeWindow_fromSurface(env, jSurface);
  return _window;
}

void RNSkAndroidCanvasProvider::releaseWindow() {
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
}

void RNSkAndroidCanvasProvider::updateTargetInfo() {
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

bool RNSkAndroidCanvasProvider::getTargetInfo(RNSkGraphiteTargetInfo *info) {
  std::lock_guard<std::mutex> lock(_targetInfoMutex);
  if (!_hasTargetInfo) {
    return false;
  }
  *info = _targetInfo;
  return true;
}

bool RNSkAndroidCanvasProvider::presentRecordings(
    const std::vector<skgpu::graphite::Recording *> &recordings) {
  if (_surfaceHolder == nullptr) {
    return false;
  }
  return static_cast<DawnWindowContext *>(_surfaceHolder.get())
      ->presentRecordings(recordings);
}

void RNSkAndroidCanvasProvider::surfaceAvailable(jobject surface, int width,
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
  _surfaceHolder = DawnContext::getInstance().MakeWindow(window, width, height,
                                                         highBitDepth);
  updateTargetInfo();

  // Post redraw request to ensure we paint in the next draw cycle.
  requestRedraw();
}

void RNSkAndroidCanvasProvider::surfaceDestroyed() {
  // destroy the renderer (a unique pointer so the dtor will be called
  // immediately.)
  _surfaceHolder = nullptr;
  updateTargetInfo();
  releaseWindow();
}

void RNSkAndroidCanvasProvider::surfaceSizeChanged(jobject jSurface, int width,
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
    updateTargetInfo();
  }

  // Redraw after size change
  requestRedraw();
}
} // namespace RNSkia
