#include "OpenGLWindowContext.h"
#include "GrAHardwareBufferUtils.h"

#include "OpenGLContext.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/gpu/ganesh/SkImageGanesh.h"
#include "include/gpu/ganesh/gl/GrGLBackendSurface.h"
#include "src/gpu/ganesh/gl/GrGLDefines.h"

#pragma clang diagnostic pop

namespace RNSkia {

sk_sp<SkSurface> OpenGLWindowContext::getSurface() {
  if (_skSurface == nullptr) {
    _glContext->makeCurrent(_glSurface.get());
    GLint stencil;
    glGetIntegerv(GL_STENCIL_BITS, &stencil);

    GLint samples;
    glGetIntegerv(GL_SAMPLES, &samples);

    auto colorType = kRGBA_8888_SkColorType;

    auto maxSamples =
        _directContext->maxSurfaceSampleCountForColorType(colorType);

    if (samples > maxSamples) {
      samples = maxSamples;
    }

    GrGLFramebufferInfo fbInfo;
    fbInfo.fFBOID = 0;
    fbInfo.fFormat = GR_GL_RGBA8;
    // fbInfo.fProtected =
    // skgpu::Protected(fDisplayParams.fCreateProtectedNativeBackend);

    auto width = ANativeWindow_getWidth(_window);
    auto height = ANativeWindow_getHeight(_window);
    auto backendRT =
        GrBackendRenderTargets::MakeGL(width, height, samples, stencil, fbInfo);
    sk_sp<SkColorSpace> colorSpace = SkColorSpace::MakeSRGB();
    SkSurfaceProps surfaceProps(0, kRGB_H_SkPixelGeometry);
    _skSurface = SkSurfaces::WrapBackendRenderTarget(
        _directContext, backendRT, kBottomLeft_GrSurfaceOrigin,
        kRGBA_8888_SkColorType, colorSpace, &surfaceProps);
  }
  return _skSurface;
}

void OpenGLWindowContext::present() {
  _glContext->makeCurrent(_glSurface.get());
  _directContext->flushAndSubmit();
  _glSurface->present();
}

} // namespace RNSkia
