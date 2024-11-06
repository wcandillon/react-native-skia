#pragma once

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
  DawnWindowContext(skgpu::graphite::Context *context,
                    skgpu::graphite::Recorder *recorder, wgpu::Device device,
                    wgpu::Surface surface, int width, int height)
      : _context(context), _recorder(recorder), _device(device),
        _surface(surface), _width(width), _height(height) {
    wgpu::SurfaceConfiguration config;
    config.device = _device;
    config.format = _format;
    // TODO: alpha mode
    config.width = _width;
    config.height = _height;
    _surface.Configure(&config);
  }

  sk_sp<SkSurface> getSurface() override {
    wgpu::SurfaceTexture surfaceTexture;
    _surface.GetCurrentTexture(&surfaceTexture);
    // SkASSERT(surfaceTexture.texture);
    auto texture = surfaceTexture.texture;

    skgpu::graphite::DawnTextureInfo info(
        /*sampleCount=*/1, skgpu::Mipmapped::kNo, _format, texture.GetUsage(),
        wgpu::TextureAspect::All);
    auto backendTex = skgpu::graphite::BackendTextures::MakeDawn(texture.Get());
    sk_sp<SkColorSpace> colorSpace = SkColorSpace::MakeSRGB();
    SkSurfaceProps surfaceProps(0, kRGB_H_SkPixelGeometry);
    auto surface = SkSurfaces::WrapBackendTexture(
        _recorder, backendTex, kBGRA_8888_SkColorType, colorSpace, &surfaceProps);
    return surface;
  }

  void present() override {
    std::unique_ptr<skgpu::graphite::Recording> recording = _recorder->snap();
    if (recording) {
      skgpu::graphite::InsertRecordingInfo info;
      info.fRecording = recording.get();
      _context->insertRecording(info);
      _context->submit(skgpu::graphite::SyncToCpu::kNo);
    }
#ifdef __APPLE__
    dawn::native::metal::WaitForCommandsToBeScheduled(_device.Get());
#endif
    _surface.Present();
  }

  void resize(int width, int height) override {
    // TODO: implement
    _width = width;
    _height = height;
  }

  int getWidth() override { return _width; }

  int getHeight() override { return _height; }

private:
  skgpu::graphite::Context *_context;
  skgpu::graphite::Recorder *_recorder;
  wgpu::Device _device;
  wgpu::Surface _surface;
#ifdef __APPLE__
  wgpu::TextureFormat _format = wgpu::TextureFormat::BGRA8Unorm;
#elif __ANDROID__
  wgpu::TextureFormat _format = wgpu::TextureFormat::RGBA8Unorm;
#endif
  int _width;
  int _height;
};

} // namespace RNSkia
