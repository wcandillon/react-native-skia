#include "RNSkOpenGLCanvasProvider.h"

#include <memory>

#include <fbjni/fbjni.h>
#include <jni.h>

#include <android/native_window_jni.h>
#include <android/surface_texture.h>
#include <android/surface_texture_jni.h>

#include "DawnContext.h"
#include "RNSkLog.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkCanvas.h"
#include "include/core/SkSurface.h"

#pragma clang diagnostic pop

namespace RNSkia {

RNSkOpenGLCanvasProvider::RNSkOpenGLCanvasProvider(
    std::function<void()> requestRedraw,
    std::shared_ptr<RNSkia::RNSkPlatformContext> platformContext)
    : RNSkCanvasProvider(requestRedraw), _platformContext(platformContext) {}

RNSkOpenGLCanvasProvider::~RNSkOpenGLCanvasProvider() {}

float RNSkOpenGLCanvasProvider::getScaledWidth() {
  if (_surfaceHolder) {
    return static_cast<float>(_surfaceHolder->getWidth());
  }
  return 0;
}

float RNSkOpenGLCanvasProvider::getScaledHeight() {
  if (_surfaceHolder) {
    return static_cast<float>(_surfaceHolder->getHeight());
  }
  return 0;
}

bool RNSkOpenGLCanvasProvider::renderToCanvas(
    const std::function<void(SkCanvas *)> &cb) {
  if (_surfaceHolder != nullptr && cb != nullptr) {
    auto surface = _surfaceHolder->getSurface();
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

void RNSkOpenGLCanvasProvider::surfaceAvailable(jobject jSurface,
                                                int width, int height) {
  // Create renderer!
  JNIEnv *env = facebook::jni::Environment::current();

  auto window = ANativeWindow_fromSurface(env, jSurface);
  _surfaceHolder =
      DawnContext::getInstance().MakeWindow(window, width, height);

  // Post redraw request to ensure we paint in the next draw cycle.
  _requestRedraw();
}
void RNSkOpenGLCanvasProvider::surfaceDestroyed() {
  // destroy the renderer (a unique pointer so the dtor will be called
  // immediately.)
  _surfaceHolder = nullptr;
}

void RNSkOpenGLCanvasProvider::surfaceSizeChanged(int width, int height) {
  if (width == 0 && height == 0) {
    // Setting width/height to zero is nothing we need to care about when
    // it comes to invalidating the surface.
    return;
  }

  // Recreate RenderContext surface based on size change???
  _surfaceHolder->resize(width, height);

  // Redraw after size change
  _requestRedraw();
}
} // namespace RNSkia
