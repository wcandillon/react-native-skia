#pragma once

#include "RNDawnUtils.h"
#include "RNMetalLayerColorSpace.h"
#include "RNWindowContext.h"

#include "dawn/native/MetalBackend.h"
#include "webgpu/webgpu_cpp.h"

#include "include/core/SkColorSpace.h"

#include <vector>

#include "include/gpu/graphite/BackendTexture.h"
#include "include/gpu/graphite/Context.h"
#include "include/gpu/graphite/ContextOptions.h"
#include "include/gpu/graphite/GraphiteTypes.h"
#include "include/gpu/graphite/Recorder.h"
#include "include/gpu/graphite/Recording.h"
#include "include/gpu/graphite/Surface.h"
#include "include/gpu/graphite/TextureInfo.h"
#include "include/gpu/graphite/dawn/DawnBackendContext.h"
#include "include/gpu/graphite/dawn/DawnGraphiteTypes.h"
#include "include/gpu/graphite/dawn/DawnTypes.h"
#include "include/gpu/graphite/dawn/DawnUtils.h"

namespace RNSkia {

class DawnWindowContext : public WindowContext {
public:
  DawnWindowContext(skgpu::graphite::Recorder *recorder, wgpu::Device device,
                    wgpu::Surface surface, void *nativeSurface, int width,
                    int height, bool highBitDepth = false,
                    bool useP3ColorSpace = false)
      : _recorder(recorder), _device(device), _surface(surface),
        _nativeSurface(nativeSurface), _useP3ColorSpace(useP3ColorSpace),
        _width(width), _height(height) {
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
    SkSurfaceProps surfaceProps;
    auto surface = SkSurfaces::WrapBackendTexture(
        _recorder, backendTex, _colorType,
        DawnUtils::viewColorSpace(_useP3ColorSpace), &surfaceProps);
    return surface;
  }

  void present() override;

  // Replays Graphite recordings (deferred canvas targets) onto the current
  // swapchain texture, in order, and presents it. Nothing is recorded on the
  // window's own recorder.
  bool presentRecordings(
      const std::vector<skgpu::graphite::Recording *> &recordings);

  // Draws an image at the origin of the current swapchain texture (on the
  // window's own recorder) and presents it.
  bool presentImage(const sk_sp<SkImage> &image);

  SkColorType getColorType() const { return _colorType; }

  // Whether the window is in Display P3 rather than sRGB: a deferred canvas
  // must be recorded in the color space of the window it is replayed onto.
  bool usesP3ColorSpace() const { return _useP3ColorSpace; }

  // The texture description a deferred canvas must be recorded with to be
  // replayed onto this window.
  skgpu::graphite::TextureInfo getTextureInfo() const {
    return skgpu::graphite::TextureInfos::MakeDawn(
        skgpu::graphite::DawnTextureInfo(skgpu::graphite::SampleCount::k1,
                                         skgpu::Mipmapped::kNo, _format, _usage,
                                         wgpu::TextureAspect::All));
  }

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
    _usage = supportedSurfaceUsage();
    config.usage = _usage;
#ifdef __APPLE__
    config.alphaMode = wgpu::CompositeAlphaMode::Premultiplied;
#endif
    _surface.Configure(&config);
#ifdef __APPLE__
    // The layer is tagged with the gamut the window renders in; float formats
    // need the (gamma-encoded) extended variant so the values display
    // identically to the 8-bit path.
    applyCAMetalLayerColorSpace(_nativeSurface, _format, _useP3ColorSpace);
#endif
  }

  // Graphite needs more than RenderAttachment on the swapchain texture:
  // TextureBinding so a render pass can reload the existing contents through
  // LoadOp::ExpandResolveTexture (any backdrop filter or mid-frame readback
  // splits the pass), and CopySrc for copy tasks. Only request what the
  // surface reports as supported.
  wgpu::TextureUsage supportedSurfaceUsage() {
    wgpu::TextureUsage usage = wgpu::TextureUsage::RenderAttachment;
    wgpu::SurfaceCapabilities capabilities;
    if (_surface.GetCapabilities(_device.GetAdapter(), &capabilities) !=
        wgpu::Status::Success) {
      return usage;
    }
    for (auto extra :
         {wgpu::TextureUsage::TextureBinding, wgpu::TextureUsage::CopySrc}) {
      if ((capabilities.usages & extra) &&
          (DawnUtils::DefaultTargetUsage & extra)) {
        usage |= extra;
      }
    }
    return usage;
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
  bool _useP3ColorSpace;
  wgpu::TextureFormat _format;
  wgpu::TextureUsage _usage = wgpu::TextureUsage::RenderAttachment;
  SkColorType _colorType;
  int _width;
  int _height;
};

} // namespace RNSkia
