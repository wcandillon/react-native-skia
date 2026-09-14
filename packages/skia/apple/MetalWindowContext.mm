#include "MetalWindowContext.h"

#include "MetalContext.h"
#include "MetalLayerColorSpaceUtils.h"
#include "RNSkLog.h"
#include "include/core/SkColorSpace.h"

MetalWindowContext::MetalWindowContext(GrDirectContext *directContext,
                                       id<MTLDevice> device,
                                       id<MTLCommandQueue> commandQueue,
                                       CALayer *layer, int width, int height,
                                       bool useP3ColorSpace, bool highBitDepth)
    : _directContext(directContext), _commandQueue(commandQueue),
      _highBitDepth(highBitDepth) {
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wunguarded-availability-new"
  _layer = (CAMetalLayer *)layer;
#pragma clang diagnostic pop
  _layer.framebufferOnly = NO;
  _layer.device = device;
  _layer.opaque = false;
#if !TARGET_OS_OSX
  _layer.contentsScale = [UIScreen mainScreen].scale;
#else
  _layer.contentsScale = [NSScreen mainScreen].backingScaleFactor;
#endif // !TARGET_OS_OSX
  _layer.pixelFormat =
      _highBitDepth ? MTLPixelFormatRGBA16Float : MTLPixelFormatBGRA8Unorm;
  _layer.contentsGravity = kCAGravityBottomLeft;
  _layer.drawableSize = CGSizeMake(width, height);
  BOOL supportsWideColor = NO;
  if (useP3ColorSpace) {
#if !TARGET_OS_OSX
    if (@available(iOS 10.0, *)) {
      supportsWideColor = [UIScreen mainScreen].traitCollection.displayGamut ==
                          UIDisplayGamutP3;
    }
#else
    if (@available(macOS 10.12, *)) {
      NSScreen *screen = [NSScreen mainScreen];
      NSColorSpace *displayP3 = [NSColorSpace displayP3ColorSpace];
      if (screen.colorSpace && displayP3) {
        supportsWideColor = [screen.colorSpace isEqual:displayP3];
      }
    }
#endif // !TARGET_OS_OSX
  }
  if (supportsWideColor) {
    _useP3ColorSpace = true;
  }
  RNSkia::setCAMetalLayerColorSpace(_layer, _highBitDepth, _useP3ColorSpace);
}

sk_sp<SkSurface> MetalWindowContext::getSurface() {
  if (_skSurface) {
    return _skSurface;
  }

  // Get the next drawable from the CAMetalLayer
  _currentDrawable = [_layer nextDrawable];
  if (!_currentDrawable) {
    RNSkia::RNSkLogger::logToConsole(
        "Could not retrieve drawable from CAMetalLayer");
    return nullptr;
  }

  // Get the texture from the drawable
  GrMtlTextureInfo fbInfo;
  fbInfo.fTexture.retain((__bridge void *)_currentDrawable.texture);

  GrBackendRenderTarget backendRT = GrBackendRenderTargets::MakeMtl(
      _layer.drawableSize.width, _layer.drawableSize.height, fbInfo);

  sk_sp<SkColorSpace> skColorSpace =
      _useP3ColorSpace ? SkColorSpace::MakeRGB(SkNamedTransferFn::kSRGB,
                                               SkNamedGamut::kDisplayP3)
                       : nullptr;
  _skSurface = SkSurfaces::WrapBackendRenderTarget(
      _directContext, backendRT, kTopLeft_GrSurfaceOrigin,
      _highBitDepth ? kRGBA_F16_SkColorType : kBGRA_8888_SkColorType,
      skColorSpace, nullptr);

  return _skSurface;
}

void MetalWindowContext::present() {
  if (auto dContext = GrAsDirectContext(_skSurface->recordingContext())) {
    dContext->flushAndSubmit();
  }

  id<MTLCommandBuffer> commandBuffer([_commandQueue commandBuffer]);
  [commandBuffer presentDrawable:_currentDrawable];
  [commandBuffer commit];
  _skSurface = nullptr;
}
