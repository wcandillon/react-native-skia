#pragma once

#include "MetalWindowContext.h"
#include "SkiaCVPixelBufferUtils.h"

#include "include/core/SkSurface.h"

#import <include/gpu/ganesh/GrBackendSurface.h>
#import <include/gpu/ganesh/GrDirectContext.h>
#import <include/gpu/ganesh/SkImageGanesh.h>
#import <include/gpu/ganesh/SkSurfaceGanesh.h>
#import <include/gpu/ganesh/mtl/GrMtlBackendContext.h>
#import <include/gpu/ganesh/mtl/GrMtlBackendSurface.h>
#import <include/gpu/ganesh/mtl/GrMtlDirectContext.h>
#import <include/gpu/ganesh/mtl/SkSurfaceMetal.h>

class MetalSharedContext {
public:
  static MetalSharedContext &getInstance() {
    static MetalSharedContext instance;
    return instance;
  }

  id<MTLDevice> getDevice() { return _device; }

private:
  MetalSharedContext() {
    _device = MTLCreateSystemDefaultDevice();
    if (!_device) {
      throw std::runtime_error("Failed to create Metal device");
    }
  }

  MetalSharedContext(const MetalSharedContext &) = delete;
  MetalSharedContext &operator=(const MetalSharedContext &) = delete;

  id<MTLDevice> _device;
};

struct OffscreenRenderContext {
  id<MTLTexture> texture;

  OffscreenRenderContext(id<MTLDevice> device,
                         sk_sp<GrDirectContext> skiaContext,
                         id<MTLCommandQueue> commandQueue, int width,
                         int height) {
    // Create a Metal texture descriptor
    MTLTextureDescriptor *textureDescriptor = [MTLTextureDescriptor
        texture2DDescriptorWithPixelFormat:MTLPixelFormatBGRA8Unorm
                                     width:width
                                    height:height
                                 mipmapped:NO];
    textureDescriptor.usage =
        MTLTextureUsageRenderTarget | MTLTextureUsageShaderRead;
    texture = [device newTextureWithDescriptor:textureDescriptor];
  }
};

class MetalContext {

public:
  MetalContext(const MetalContext &) = delete;
  MetalContext &operator=(const MetalContext &) = delete;

  static MetalContext &getInstance() {
    static thread_local MetalContext instance;
    return instance;
  }

  sk_sp<SkSurface> MakeOffscreen(int width, int height) {
    auto device = MetalSharedContext::getInstance().getDevice();
    auto ctx = new OffscreenRenderContext(device, _directContext, _commandQueue,
                                          width, height);

    // Create a GrBackendTexture from the Metal texture
    GrMtlTextureInfo info;
    info.fTexture.retain((__bridge void *)ctx->texture);
    GrBackendTexture backendTexture =
        GrBackendTextures::MakeMtl(width, height, skgpu::Mipmapped::kNo, info);

    // Create a SkSurface from the GrBackendTexture
    auto surface = SkSurfaces::WrapBackendTexture(
        _directContext.get(), backendTexture, kTopLeft_GrSurfaceOrigin, 0,
        kBGRA_8888_SkColorType, nullptr, nullptr,
        [](void *addr) { delete (OffscreenRenderContext *)addr; }, ctx);

    return surface;
  }

  sk_sp<SkImage> MakeImageFromBuffer(void *buffer) {

    CVPixelBufferRef sampleBuffer = (CVPixelBufferRef)buffer;
    SkiaCVPixelBufferUtils::CVPixelBufferBaseFormat format =
        SkiaCVPixelBufferUtils::getCVPixelBufferBaseFormat(sampleBuffer);
    switch (format) {
    case SkiaCVPixelBufferUtils::CVPixelBufferBaseFormat::rgb: {
      // CVPixelBuffer is in any RGB format, single-plane
      return SkiaCVPixelBufferUtils::RGB::makeSkImageFromCVPixelBuffer(
          _directContext.get(), sampleBuffer);
    }
    case SkiaCVPixelBufferUtils::CVPixelBufferBaseFormat::yuv: {
      // CVPixelBuffer is in any YUV format, multi-plane
      return SkiaCVPixelBufferUtils::YUV::makeSkImageFromCVPixelBuffer(
          _directContext.get(), sampleBuffer);
    }
    default:
      [[unlikely]] {
        throw std::runtime_error("Failed to convert NativeBuffer to SkImage - "
                                 "NativeBuffer has unsupported PixelFormat! " +
                                 std::to_string(static_cast<int>(format)));
      }
    }
  }

  std::unique_ptr<RNSkia::WindowContext> MakeWindow(CALayer *window, int width,
                                                    int height) {
    auto device = MetalSharedContext::getInstance().getDevice();
    return std::make_unique<MetalWindowContext>(
        _directContext.get(), device, _commandQueue, window, width, height);
  }

  GrDirectContext *getDirectContext() { return _directContext.get(); }

private:
  id<MTLCommandQueue> _commandQueue = nullptr;
  sk_sp<GrDirectContext> _directContext = nullptr;

  MetalContext();
};
