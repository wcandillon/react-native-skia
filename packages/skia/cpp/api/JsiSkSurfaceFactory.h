#pragma once

#include <memory>
#include <string>
#include <utility>
#include <variant>

#include <jsi/jsi.h>

#include "JsiGPUTexture.h"
#include "JsiSkNativeObjects.h"
#include "SkiaErrors.h"

#include "JsiSkSurface.h"

#include "rnskia/RNDawnContext.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkSurface.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkSurfaceFactory : public JsiSkNativeObject<JsiSkSurfaceFactory> {
public:
  static constexpr const char *CLASS_NAME = "SurfaceFactory";

  /** Throws a SkiaValidationError for a size no surface can have. */
  static void validateSize(const char *method, int width, int height) {
    if (width <= 0 || height <= 0) {
      throw SkiaErrors::validation(
          std::string(method) + ": the size must be at least 1x1, got " +
          std::to_string(width) + "x" + std::to_string(height));
    }
  }

  // A CPU surface: its pixels live in memory, and its snapshots are raster
  // images. MakeOffscreen() is the GPU counterpart.
  std::shared_ptr<JsiSkSurface> MakeRaster(int width, int height) {
    validateSize("MakeRaster", width, height);
    auto imageInfo = SkImageInfo::MakeN32Premul(width, height);
    auto surface = SkSurfaces::Raster(imageInfo);
    if (surface == nullptr) {
      throw SkiaErrors::outOfMemory("MakeRaster: no memory for a " +
                                    std::to_string(width) + "x" +
                                    std::to_string(height) + " surface");
    }
    return std::make_shared<JsiSkSurface>(getContext(), std::move(surface));
  }

  // A GPU surface. Like a WebGPU device's createTexture(), it never fails for
  // a lost device: it is a dead surface then (see JsiSkSurface::makeDead),
  // which the app makes again once Skia.gpu.lost resolves.
  JSI_HOST_FUNCTION(MakeOffscreen) {
    auto width = static_cast<int>(arguments[0].asNumber());
    auto height = static_cast<int>(arguments[1].asNumber());
    bool useP3ColorSpace = false;
    if (count >= 3 && arguments[2].isObject()) {
      auto opts = arguments[2].asObject(runtime);
      if (opts.hasProperty(runtime, "colorSpace")) {
        auto colorSpaceVal = opts.getProperty(runtime, "colorSpace");
        if (colorSpaceVal.isString()) {
          useP3ColorSpace =
              colorSpaceVal.asString(runtime).utf8(runtime) == "display-p3";
        }
      }
    }
    validateSize("MakeOffscreen", width, height);
    auto *dawn = DawnContext::tryGetInstance();
    if (dawn == nullptr) {
      throw SkiaErrors::gpuUnavailable(DawnContext::getGpuInfo().error);
    }
    if (DawnContext::isDeviceLost()) {
      return makeJsiObject(runtime,
                           JsiSkSurface::makeDead(getContext(), width, height));
    }
    auto maxSize = static_cast<int>(dawn->getMaxTextureDimension());
    if (maxSize > 0 && (width > maxSize || height > maxSize)) {
      throw SkiaErrors::validation(
          "MakeOffscreen: " + std::to_string(width) + "x" +
          std::to_string(height) +
          " exceeds the largest texture the GPU has, " +
          std::to_string(maxSize) + "x" + std::to_string(maxSize));
    }
    sk_sp<SkSurface> surface;
    try {
      surface =
          getContext()->makeOffscreenSurface(width, height, useP3ColorSpace);
    } catch (const std::exception &) {
      surface = nullptr;
    }
    if (surface == nullptr) {
      if (DawnContext::isDeviceLost()) {
        return makeJsiObject(
            runtime, JsiSkSurface::makeDead(getContext(), width, height));
      }
      throw SkiaErrors::outOfMemory("MakeOffscreen: no GPU memory for a " +
                                    std::to_string(width) + "x" +
                                    std::to_string(height) + " surface");
    }
    return makeJsiObject(runtime, std::make_shared<JsiSkSurface>(
                                      getContext(), std::move(surface)));
  }

  // Pointer-based texture interop with react-native-webgpu, the surface
  // counterpart of JsiSkImageFactory::MakeFromGPUTexture: Skia draws
  // directly into a texture created on the shared device, so WebGPU can
  // sample what Skia drew without any copy.
  JSI_HOST_FUNCTION(MakeFromGPUTexture) {
    if (count < 1) {
      throw SkiaErrors::typeError(
          "MakeFromGPUTexture requires a GPUTexture argument");
    }
    // The surface keeps the texture alive for its lifetime, and the JS
    // GPUTexture keeps its own reference, which the caller may release once
    // the surface exists.
    wgpu::Texture texture =
        gpuTextureFromValue(runtime, arguments[0], "MakeFromGPUTexture");
    auto *dawn = DawnContext::tryGetInstance();
    if (dawn == nullptr) {
      throw SkiaErrors::gpuUnavailable(DawnContext::getGpuInfo().error);
    }
    auto width = static_cast<int>(texture.GetWidth());
    auto height = static_cast<int>(texture.GetHeight());
    if (DawnContext::isDeviceLost()) {
      return makeJsiObject(runtime,
                           JsiSkSurface::makeDead(getContext(), width, height));
    }
    if (!(texture.GetUsage() & wgpu::TextureUsage::RenderAttachment)) {
      throw SkiaErrors::validation("MakeFromGPUTexture: the texture needs the "
                                   "RENDER_ATTACHMENT usage");
    }
    auto surface = dawn->MakeSurfaceFromTexture(texture);
    if (surface == nullptr) {
      if (DawnContext::isDeviceLost()) {
        return makeJsiObject(
            runtime, JsiSkSurface::makeDead(getContext(), width, height));
      }
      throw SkiaErrors::validation(
          "MakeFromGPUTexture: the texture cannot be drawn into: it must be "
          "made on the shared device, in a format Skia renders to");
    }
    return makeJsiObject(runtime, std::make_shared<JsiSkSurface>(
                                      getContext(), std::move(surface)));
  }

  size_t getMemoryPressure() override { return 2048; }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installMethod(runtime, prototype, "MakeRaster",
                  &JsiSkSurfaceFactory::MakeRaster);
    installHostMethod(runtime, prototype, "MakeOffscreen",
                      &JsiSkSurfaceFactory::MakeOffscreen);
    installHostMethod(runtime, prototype, "MakeFromGPUTexture",
                      &JsiSkSurfaceFactory::MakeFromGPUTexture);
  }

  explicit JsiSkSurfaceFactory(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkNativeObject<JsiSkSurfaceFactory>(std::move(context)) {}
};

} // namespace RNSkia
