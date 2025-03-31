#include "MetalWindowContext.h"

#include "MetalContext.h"
#include "RNSkLog.h"

MetalWindowContext::MetalWindowContext(GrDirectContext *directContext,
                                       id<MTLDevice> device,
                                       id<MTLCommandQueue> commandQueue,
                                       CALayer *layer, int width, int height)
    : _directContext(directContext), _commandQueue(commandQueue) {
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
  _layer.pixelFormat = MTLPixelFormatBGRA8Unorm;
  _layer.contentsGravity = kCAGravityBottomLeft;
  _layer.drawableSize = CGSizeMake(width, height);
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

  _skSurface = SkSurfaces::WrapBackendRenderTarget(
      _directContext, backendRT, kTopLeft_GrSurfaceOrigin,
      kBGRA_8888_SkColorType, nullptr, nullptr);

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
