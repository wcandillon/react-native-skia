#pragma once

#include <memory>

#include "EGL/egl.h"
#include "GLES2/gl2.h"

#include "gl/Context.h"
#include "gl/Error.h"

namespace gl {

class Context;
class Surface;

class Display {
public:
  Display() {
    EGLDisplay display = eglGetDisplay(EGL_DEFAULT_DISPLAY);

    if (eglInitialize(display, nullptr, nullptr) != EGL_TRUE) {
      LOG_EGL_ERROR;
      return;
    }
    _display = display;
  }

  ~Display() {
    if (_display != EGL_NO_DISPLAY) {
      if (eglTerminate(_display) != EGL_TRUE) {
        LOG_EGL_ERROR;
      }
    }
  }

  bool isValid() const { return _display != EGL_NO_DISPLAY; }

  void clearContext() {
    eglMakeCurrent(_display, EGL_NO_SURFACE, EGL_NO_SURFACE, EGL_NO_CONTEXT);
  }

  EGLConfig chooseConfig() {

    EGLint att[] = {EGL_RENDERABLE_TYPE,
                    EGL_OPENGL_ES2_BIT,
                    EGL_SURFACE_TYPE,
                    EGL_WINDOW_BIT | EGL_PBUFFER_BIT,
                    EGL_ALPHA_SIZE,
                    8,
                    EGL_BLUE_SIZE,
                    8,
                    EGL_GREEN_SIZE,
                    8,
                    EGL_RED_SIZE,
                    8,
                    EGL_DEPTH_SIZE,
                    0,
                    EGL_STENCIL_SIZE,
                    0,
                    EGL_SAMPLE_BUFFERS,
                    0,
                    EGL_NONE};

    EGLint numConfigs;
    EGLConfig glConfig = 0;
    if (eglChooseConfig(_display, att, &glConfig, 1, &numConfigs) != EGL_TRUE ||
        numConfigs == 0) {
      LOG_EGL_ERROR;
      return 0;
    }

    return glConfig;
  }

  std::unique_ptr<Context> makeContext(const EGLConfig &config,
                                       const Context *share_context) {
    EGLint contextAttribs[] = {EGL_CONTEXT_CLIENT_VERSION, 2, EGL_NONE};
    auto context = eglCreateContext(
        _display, config,
        share_context != nullptr ? share_context->getHandle() : nullptr,
        contextAttribs);

    if (context == EGL_NO_CONTEXT) {
      LOG_EGL_ERROR;
      return nullptr;
    }
    return std::unique_ptr<Context>(new Context(_display, context));
  }

  std::unique_ptr<Surface> makeWindowSurface(const EGLConfig &config,
                                             ANativeWindow *window) {
    const EGLint attribs[] = {EGL_NONE};
    auto surface = eglCreateWindowSurface(_display, config, window, attribs);
    if (surface == EGL_NO_SURFACE) {
      LOG_EGL_ERROR;
      return nullptr;
    }
    return std::make_unique<Surface>(_display, surface);
  }

  std::unique_ptr<Surface> makePixelBufferSurface(const EGLConfig &config,
                                                  size_t width, size_t height) {
    const EGLint attribs[] = {EGL_WIDTH, static_cast<EGLint>(width), EGL_HEIGHT,
                              static_cast<EGLint>(height), EGL_NONE};
    auto surface = eglCreatePbufferSurface(_display, config, attribs);
    if (surface == EGL_NO_SURFACE) {
      LOG_EGL_ERROR;
      return nullptr;
    }
    return std::make_unique<Surface>(_display, surface);
  }

  const EGLDisplay &getHandle() const { return _display; }

private:
  EGLDisplay _display = EGL_NO_DISPLAY;

  Display(const Display &) = delete;

  Display &operator=(const Display &) = delete;
};

} // namespace gl
