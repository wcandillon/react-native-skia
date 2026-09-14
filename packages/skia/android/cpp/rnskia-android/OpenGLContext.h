#pragma once

#include "GrAHardwareBufferUtils.h"
#include "OpenGLWindowContext.h"
#include "gl/Display.h"

#include "include/core/SkCanvas.h"
#include "include/core/SkColorSpace.h"
#include "include/core/SkSurface.h"
#include "include/gpu/ganesh/GrDirectContext.h"
#include "include/gpu/ganesh/SkImageGanesh.h"
#include "include/gpu/ganesh/gl/GrGLBackendSurface.h"
#include "include/gpu/ganesh/gl/GrGLDirectContext.h"
#include "include/gpu/ganesh/gl/GrGLInterface.h"
#include "src/gpu/ganesh/gl/GrGLDefines.h"

namespace RNSkia {

class OpenGLSharedContext {
public:
  OpenGLSharedContext(const OpenGLSharedContext &) = delete;
  OpenGLSharedContext &operator=(const OpenGLSharedContext &) = delete;

  static OpenGLSharedContext &getInstance() {
    static OpenGLSharedContext instance;
    return instance;
  }

  gl::Display *getDisplay() { return _glDisplay.get(); }
  gl::Context *getContext() { return _glContext.get(); }
  gl::Surface *getSurface() { return _glSurface.get(); };
  EGLConfig getConfig() { return _glConfig; }

private:
  std::unique_ptr<gl::Display> _glDisplay;
  std::unique_ptr<gl::Context> _glContext;
  std::unique_ptr<gl::Surface> _glSurface;
  EGLConfig _glConfig;

  OpenGLSharedContext() {
    _glDisplay = std::make_unique<gl::Display>();
    _glConfig = _glDisplay->chooseConfig();
    _glContext = _glDisplay->makeContext(_glConfig, nullptr);
    _glSurface = _glDisplay->makePixelBufferSurface(_glConfig, 1, 1);
    if (_glContext == nullptr || _glSurface == nullptr) {
      RNSkLogger::logToConsole(
          "Couldn't create the shared OpenGL context or surface");
      return;
    }
    _glContext->makeCurrent(_glSurface.get());
  }
};

class OpenGLContext {
public:
  friend class OpenGLWindowContext;

  OpenGLContext(const OpenGLContext &) = delete;
  OpenGLContext &operator=(const OpenGLContext &) = delete;

  static OpenGLContext &getInstance() {
    static thread_local OpenGLContext instance;
    return instance;
  }

  sk_sp<SkSurface> MakeOffscreen(int width, int height,
                                 bool useP3ColorSpace = false) {
    if (_directContext == nullptr) {
      return nullptr;
    }

    auto colorType = kRGBA_8888_SkColorType;

    SkSurfaceProps props(0, kUnknown_SkPixelGeometry);

    auto result = _glContext->makeCurrent(_glSurface.get());
    if (!result) {
      return nullptr;
    }

    // Create texture
    auto GL_RGBA8 = 0x8058;
    auto format = GrBackendFormats::MakeGL(GL_RGBA8, GL_TEXTURE_2D);
    auto texture = _directContext->createBackendTexture(
        width, height, format, SkColors::kTransparent, skgpu::Mipmapped::kNo,
        GrRenderable::kYes);

    if (!texture.isValid()) {
      RNSkLogger::logToConsole("couldn't create offscreen texture %dx%d", width,
                               height);
      return nullptr;
    }

    struct ReleaseContext {
      GrDirectContext *directContext;
      GrBackendTexture texture;
    };

    auto releaseCtx = new ReleaseContext{.directContext = _directContext.get(),
                                         .texture = texture};

    sk_sp<SkColorSpace> colorSpace =
        useP3ColorSpace ? SkColorSpace::MakeRGB(SkNamedTransferFn::kSRGB,
                                                SkNamedGamut::kDisplayP3)
                        : nullptr;

    // Create a SkSurface from the GrBackendTexture
    return SkSurfaces::WrapBackendTexture(
        _directContext.get(), texture, kTopLeft_GrSurfaceOrigin, 0, colorType,
        colorSpace, &props,
        [](void *addr) {
          auto releaseCtx = reinterpret_cast<ReleaseContext *>(addr);
          releaseCtx->directContext->deleteBackendTexture(releaseCtx->texture);
          delete releaseCtx;
        },
        releaseCtx);
  }

  sk_sp<SkImage> MakeImageFromBuffer(void *buffer,
                                     bool requireKnownFormat = false) {
#if __ANDROID_API__ >= 26
    if (_directContext == nullptr) {
      return nullptr;
    }
    const AHardwareBuffer *hardwareBuffer =
        static_cast<AHardwareBuffer *>(buffer);
    DeleteImageProc deleteImageProc = nullptr;
    UpdateImageProc updateImageProc = nullptr;
    TexImageCtx deleteImageCtx = nullptr;

    AHardwareBuffer_Desc description;
    AHardwareBuffer_describe(hardwareBuffer, &description);
    GrBackendFormat format;
    auto colorType = kRGBA_8888_SkColorType;
    switch (description.format) {
    // TODO: find out if we can detect, which graphic buffers support
    // GR_GL_TEXTURE_2D
    case AHARDWAREBUFFER_FORMAT_R8G8B8A8_UNORM:
      format = GrBackendFormats::MakeGL(GR_GL_RGBA8, GR_GL_TEXTURE_EXTERNAL);
      colorType = kRGBA_8888_SkColorType;
      break;
    case AHARDWAREBUFFER_FORMAT_R16G16B16A16_FLOAT:
      format = GrBackendFormats::MakeGL(GR_GL_RGBA16F, GR_GL_TEXTURE_EXTERNAL);
      colorType = kRGBA_F16_SkColorType;
      break;
    case AHARDWAREBUFFER_FORMAT_R5G6B5_UNORM:
      format = GrBackendFormats::MakeGL(GR_GL_RGB565, GR_GL_TEXTURE_EXTERNAL);
      colorType = kRGB_565_SkColorType;
      break;
    case AHARDWAREBUFFER_FORMAT_R10G10B10A2_UNORM:
      format = GrBackendFormats::MakeGL(GR_GL_RGB10_A2, GR_GL_TEXTURE_EXTERNAL);
      colorType = kRGBA_1010102_SkColorType;
      break;
    case AHARDWAREBUFFER_FORMAT_R8G8B8_UNORM:
      format = GrBackendFormats::MakeGL(GR_GL_RGB8, GR_GL_TEXTURE_EXTERNAL);
      colorType = kRGB_888x_SkColorType;
      break;
#if __ANDROID_API__ >= 33
    case AHARDWAREBUFFER_FORMAT_R8_UNORM:
      format = GrBackendFormats::MakeGL(GR_GL_R8, GR_GL_TEXTURE_EXTERNAL);
      colorType = kAlpha_8_SkColorType;
      break;
#endif
    default:
      if (requireKnownFormat) {
        format = GrBackendFormat();
      } else {
        format = GrBackendFormats::MakeGL(GR_GL_RGBA8, GR_GL_TEXTURE_EXTERNAL);
      }
    }
    auto width = static_cast<int>(description.width);
    auto height = static_cast<int>(description.height);
    auto backendTex = MakeGLBackendTexture(
        _directContext.get(), const_cast<AHardwareBuffer *>(hardwareBuffer),
        width, height, &deleteImageProc, &updateImageProc, &deleteImageCtx,
        false, format, false);
    if (!backendTex.isValid()) {
      RNSkLogger::logToConsole(
          "Failed to convert HardwareBuffer to OpenGL Texture!");
      return nullptr;
    }
    sk_sp<SkImage> image = SkImages::BorrowTextureFrom(
        _directContext.get(), backendTex, kTopLeft_GrSurfaceOrigin, colorType,
        kOpaque_SkAlphaType, nullptr, deleteImageProc, deleteImageCtx);
    return image;
#else
    throw std::runtime_error(
        "HardwareBuffers are only supported on Android API 26 or higher! Set "
        "your minSdk to 26 (or higher) and try again.");
#endif
  }

  // TODO: remove width, height
  std::unique_ptr<WindowContext> MakeWindow(ANativeWindow *window,
                                            bool highBitDepth = false) {
    if (_directContext == nullptr) {
      RNSkLogger::logToConsole(
          "The OpenGL context is invalid, the surface will not be rendered");
      return nullptr;
    }
    auto display = OpenGLSharedContext::getInstance().getDisplay();
    if (highBitDepth) {
      // A 10-bit window surface would require the shared EGL context to be
      // created without a config (EGL_KHR_no_config_context) for every app,
      // which is too risky for existing 8-bit clients on brittle drivers.
      RNSkLogger::logToConsole(
          "highBitDepth is not supported on the OpenGL backend, falling back "
          "to the 8-bit format (the Graphite backend supports it)");
    }
    return std::make_unique<OpenGLWindowContext>(
        _directContext.get(), display, _glContext.get(), window,
        OpenGLSharedContext::getInstance().getConfig());
  }

  GrDirectContext *getDirectContext() { return _directContext.get(); }
  void makeCurrent() {
    if (_glContext != nullptr) {
      _glContext->makeCurrent(_glSurface.get());
    }
  }

private:
  std::unique_ptr<gl::Context> _glContext;
  std::unique_ptr<gl::Surface> _glSurface;
  sk_sp<GrDirectContext> _directContext;

  OpenGLContext() {
    auto display = OpenGLSharedContext::getInstance().getDisplay();
    auto sharedContext = OpenGLSharedContext::getInstance().getContext();
    auto glConfig = OpenGLSharedContext::getInstance().getConfig();
    _glContext = display->makeContext(glConfig, sharedContext);
    _glSurface = display->makePixelBufferSurface(glConfig, 1, 1);
    if (_glContext == nullptr || _glSurface == nullptr ||
        !_glContext->makeCurrent(_glSurface.get())) {
      RNSkLogger::logToConsole(
          "Couldn't create the OpenGL context, Skia rendering is disabled");
      return;
    }
    auto backendInterface = GrGLMakeNativeInterface();
    _directContext = GrDirectContexts::MakeGL(backendInterface);

    if (_directContext == nullptr) {
      RNSkLogger::logToConsole("GrDirectContexts::MakeGL failed");
    }
  }
};

} // namespace RNSkia
