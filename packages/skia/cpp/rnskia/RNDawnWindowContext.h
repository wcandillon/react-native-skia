#pragma once

#include "RNDawnUtils.h"
#include "RNMetalLayerColorSpace.h"
#include "RNWindowContext.h"

#include "dawn/native/MetalBackend.h"
#include "webgpu/webgpu_cpp.h"

#include "include/core/SkColorSpace.h"

#include "include/gpu/graphite/BackendTexture.h"
#include "include/gpu/graphite/Context.h"
#include "include/gpu/graphite/ContextOptions.h"
#include "include/gpu/graphite/GraphiteTypes.h"
#include "include/gpu/graphite/Recorder.h"
#include "include/gpu/graphite/Recording.h"
#include "include/gpu/graphite/Surface.h"
#include "include/gpu/graphite/dawn/DawnBackendContext.h"
#include "include/gpu/graphite/dawn/DawnTypes.h"
#include "include/gpu/graphite/dawn/DawnUtils.h"

namespace RNSkia {

class DawnWindowContext : public WindowContext {
public:
  DawnWindowContext(skgpu::graphite::Recorder *recorder, wgpu::Device device,
                    wgpu::Surface surface, void *nativeSurface, int width,
                    int height, bool highBitDepth = false)
      : _recorder(recorder), _device(device), _surface(surface),
        _nativeSurface(nativeSurface), _width(width), _height(height) {
    _format = DawnUtils::PreferredTextureFormat;
    _colorType = DawnUtils::PreferedColorType;
    if (highBitDepth) {
      if (surfaceSupportsFormat(DawnUtils::HighBitDepthTextureFormat)) {
        _format = DawnUtils::HighBitDepthTextureFormat;
        _colorType = DawnUtils::HighBitDepthColorType;
      } else {
        RNSkLogger::logToConsole(
            "High bit depth was requested but the surface does not support "
            "it, falling back to the 8-bit format");
      }
    }
    configureSurface();
  }

  sk_sp<SkSurface> getSurface() override {
    wgpu::SurfaceTexture surfaceTexture;
    _surface.GetCurrentTexture(&surfaceTexture);
    auto texture = surfaceTexture.texture;
    if (!texture) {
      return nullptr;
    }
    skgpu::graphite::DawnTextureInfo info(
        skgpu::graphite::SampleCount::k1, skgpu::Mipmapped::kNo, _format,
        texture.GetUsage(), wgpu::TextureAspect::All);
    auto backendTex = skgpu::graphite::BackendTextures::MakeDawn(texture.Get());
    sk_sp<SkColorSpace> colorSpace = SkColorSpace::MakeSRGB();
    SkSurfaceProps surfaceProps;
    auto surface = SkSurfaces::WrapBackendTexture(
        _recorder, backendTex, _colorType, colorSpace, &surfaceProps);
    return surface;
  }

  void present() override;

  void resize(int width, int height) override {
    _width = width;
    _height = height;
    configureSurface();
  }

  int getWidth() override { return _width; }

  int getHeight() override { return _height; }

private:
  void configureSurface() {
    wgpu::SurfaceConfiguration config;
    config.device = _device;
    config.format = _format;
    config.width = _width;
    config.height = _height;
    config.presentMode = wgpu::PresentMode::Fifo;
#ifdef __APPLE__
    config.alphaMode = wgpu::CompositeAlphaMode::Premultiplied;
#endif
    _surface.Configure(&config);
#ifdef __APPLE__
    // Float formats need the layer tagged as (gamma-encoded) extended sRGB so
    // the sRGB-encoded values display identically to the 8-bit path.
    applyCAMetalLayerColorSpace(_nativeSurface, _format);
#endif
  }

  bool surfaceSupportsFormat(wgpu::TextureFormat format) {
    wgpu::SurfaceCapabilities capabilities;
    if (_surface.GetCapabilities(_device.GetAdapter(), &capabilities) !=
        wgpu::Status::Success) {
      return false;
    }
    for (size_t i = 0; i < capabilities.formatCount; i++) {
      if (capabilities.formats[i] == format) {
        return true;
      }
    }
    return false;
  }

  skgpu::graphite::Recorder *_recorder;
  // TODO: keep device in DawnContext? Do we need it for resizing?
  wgpu::Device _device;
  wgpu::Surface _surface;
  [[maybe_unused]] void *_nativeSurface;
  wgpu::TextureFormat _format;
  SkColorType _colorType;
  int _width;
  int _height;
};

} // namespace RNSkia
