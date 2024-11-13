#pragma once

#include "DawnUtils.h"
#include "WindowContext.h"

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
                    wgpu::Surface surface, int width, int height)
      : _recorder(recorder), _device(device), _surface(surface), _width(width),
        _height(height) {
    wgpu::SurfaceConfiguration config;
    config.device = _device;
    config.format = DawnUtils::PreferredTextureFormat;
    config.width = _width;
    config.height = _height;
#ifdef __APPLE__
    config.alphaMode = wgpu::CompositeAlphaMode::Premultiplied;
#endif
    _surface.Configure(&config);
  }

  sk_sp<SkSurface> getSurface() override {
    wgpu::SurfaceTexture surfaceTexture;
    _surface.GetCurrentTexture(&surfaceTexture);
    auto texture = surfaceTexture.texture;
    skgpu::graphite::DawnTextureInfo info(
        /*sampleCount=*/1, skgpu::Mipmapped::kNo,
        DawnUtils::PreferredTextureFormat, texture.GetUsage(),
        wgpu::TextureAspect::All);
    auto backendTex = skgpu::graphite::BackendTextures::MakeDawn(texture.Get());
    sk_sp<SkColorSpace> colorSpace = SkColorSpace::MakeSRGB();
    SkSurfaceProps surfaceProps;
    auto surface = SkSurfaces::WrapBackendTexture(_recorder, backendTex,
                                                  DawnUtils::PreferedColorType,
                                                  colorSpace, &surfaceProps);
    return surface;
  }

  void present() override;

  void resize(int width, int height) override {
    throw std::runtime_error("resize not implemented yet");
  }

  int getWidth() override { return _width; }

  int getHeight() override { return _height; }

private:
  skgpu::graphite::Recorder *_recorder;
  // TODO: keep device in DawnContext? Do we need it for resizing?
  wgpu::Device _device;
  wgpu::Surface _surface;
  int _width;
  int _height;
};

} // namespace RNSkia
