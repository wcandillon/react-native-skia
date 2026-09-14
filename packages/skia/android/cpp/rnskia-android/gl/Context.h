#pragma once

#include "gl/Error.h"
#include "gl/Surface.h"

namespace gl {

class Surface;
class Display;

class Context {
public:
  ~Context() {
    if (_context != EGL_NO_CONTEXT) {
      if (eglDestroyContext(_display, _context) != EGL_TRUE) {
        LOG_EGL_ERROR;
      }
    }
  }

  bool isValid() const { return _context != EGL_NO_CONTEXT; }

  const EGLContext &getHandle() const { return _context; }

  bool makeCurrent(const Surface *surface) {
    if (_context == EGL_NO_CONTEXT) {
      return false;
    }
    if (surface == nullptr || !surface->isValid()) {
      return false;
    }
    const auto result =
        eglMakeCurrentIfNecessary(_display, surface->getHandle(),
                                  surface->getHandle(), _context) == EGL_TRUE;
    if (!result) {
      LOG_EGL_ERROR;
    }
    return result;
  }

  bool clearCurrent() {
    const auto result =
        eglMakeCurrentIfNecessary(_display, EGL_NO_SURFACE, EGL_NO_SURFACE,
                                  EGL_NO_CONTEXT) == EGL_TRUE;
    if (!result) {
      LOG_EGL_ERROR;
    }
    return result;
  }

  bool isCurrent() const { return eglGetCurrentContext() == _context; }

private:
  friend class Display;

  EGLDisplay _display = EGL_NO_DISPLAY;
  EGLContext _context = EGL_NO_CONTEXT;

  static EGLBoolean eglMakeCurrentIfNecessary(EGLDisplay display,
                                              EGLSurface draw, EGLSurface read,
                                              EGLContext context) {
    if (display != eglGetCurrentDisplay() ||
        draw != eglGetCurrentSurface(EGL_DRAW) ||
        read != eglGetCurrentSurface(EGL_READ) ||
        context != eglGetCurrentContext()) {
      return eglMakeCurrent(display, draw, read, context);
    }

    return EGL_TRUE;
  }

  Context(EGLDisplay display, EGLContext context)
      : _display(display), _context(context) {}

  Context(const Context &) = delete;

  Context &operator=(const Context &) = delete;
};

} // namespace gl