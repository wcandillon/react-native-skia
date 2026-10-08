#include "RNSkWindowSurface.h"

#include "RNDawnContext.h"
#include "RNDawnUtils.h"
#include "RNMetalLayerColorSpace.h"
#include "utils/RNSkLog.h"

#ifdef __APPLE__
#include "dawn/native/MetalBackend.h"
#endif

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkSurface.h"
#include "include/gpu/graphite/BackendTexture.h"
#include "include/gpu/graphite/Surface.h"
#include "include/gpu/graphite/dawn/DawnGraphiteTypes.h"
#include "include/gpu/graphite/dawn/DawnTypes.h"

#pragma clang diagnostic pop

namespace RNSkia {

RNSkWindowSurface::~RNSkWindowSurface() { detach(); }

void RNSkWindowSurface::attach(void *nativeHandle, int width, int height,
                               bool highBitDepth, bool useP3ColorSpace,
                               Releaser releaser) {
  detach();
  auto &context = DawnContext::getInstance();
  _device = context.getWGPUDevice();
  _recorder = context.getRecorder();
  _nativeHandle = nativeHandle;
  _releaser = std::move(releaser);
  _surface = context.MakeWGPUSurface(nativeHandle);
  if (!_surface) {
    RNSkLogger::logToConsole("Could not create a surface over the window");
    detach();
    return;
  }
  _width = width;
  _height = height;
  _useP3ColorSpace = useP3ColorSpace;
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
  updateTargetInfo();
  requestRedraw();
}

void RNSkWindowSurface::resize(int width, int height) {
  if (!_surface) {
    return;
  }
  _width = width;
  _height = height;
  configureSurface();
  updateTargetInfo();
  requestRedraw();
}

void RNSkWindowSurface::detach() {
  // The surface goes before the window it draws into.
  _surface = nullptr;
  _recorder = nullptr;
  updateTargetInfo();
  if (_releaser && _nativeHandle != nullptr) {
    _releaser(_nativeHandle);
  }
  _releaser = nullptr;
  _nativeHandle = nullptr;
}

void RNSkWindowSurface::setLayoutSize(int width, int height) {
  std::lock_guard<std::mutex> lock(_targetInfoMutex);
  _layoutWidth = width;
  _layoutHeight = height;
}

bool RNSkWindowSurface::getLayoutSize(int *width, int *height) {
  std::lock_guard<std::mutex> lock(_targetInfoMutex);
  if (_layoutWidth <= 0 || _layoutHeight <= 0) {
    return false;
  }
  *width = _layoutWidth;
  *height = _layoutHeight;
  return true;
}

int RNSkWindowSurface::getWidth() {
  std::lock_guard<std::mutex> lock(_targetInfoMutex);
  return _hasTargetInfo ? _targetInfo.width : 0;
}

int RNSkWindowSurface::getHeight() {
  std::lock_guard<std::mutex> lock(_targetInfoMutex);
  return _hasTargetInfo ? _targetInfo.height : 0;
}

bool RNSkWindowSurface::getTargetInfo(RNSkGraphiteTargetInfo *info) {
  std::lock_guard<std::mutex> lock(_targetInfoMutex);
  if (!_hasTargetInfo) {
    return false;
  }
  *info = _targetInfo;
  return true;
}

void RNSkWindowSurface::updateTargetInfo() {
  std::lock_guard<std::mutex> lock(_targetInfoMutex);
  if (!_surface) {
    _hasTargetInfo = false;
    return;
  }
  _targetInfo.width = _width;
  _targetInfo.height = _height;
  _targetInfo.colorType = _colorType;
  _targetInfo.useP3ColorSpace = _useP3ColorSpace;
  _targetInfo.textureInfo = getTextureInfo();
  _hasTargetInfo = true;
}

skgpu::graphite::TextureInfo RNSkWindowSurface::getTextureInfo() const {
  return skgpu::graphite::TextureInfos::MakeDawn(
      skgpu::graphite::DawnTextureInfo(skgpu::graphite::SampleCount::k1,
                                       skgpu::Mipmapped::kNo, _format, _usage,
                                       wgpu::TextureAspect::All));
}

void RNSkWindowSurface::configureSurface() {
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
  applyCAMetalLayerColorSpace(_nativeHandle, _format, _useP3ColorSpace);
#endif
}

wgpu::TextureUsage RNSkWindowSurface::supportedSurfaceUsage() {
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

bool RNSkWindowSurface::surfaceSupportsFormat(wgpu::TextureFormat format) {
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

bool RNSkWindowSurface::canPresent() {
  if (!_surface) {
    return false;
  }
  if (_canPresent && !_canPresent()) {
    // The frame is kept by the caller: ask for it again once the window can
    // show it.
    requestRedraw();
    return false;
  }
  return true;
}

bool RNSkWindowSurface::presentRecordings(
    const std::vector<skgpu::graphite::Recording *> &recordings) {
  if (!canPresent()) {
    return false;
  }
  wgpu::SurfaceTexture surfaceTexture;
  _surface.GetCurrentTexture(&surfaceTexture);
  auto texture = surfaceTexture.texture;
  if (!texture) {
    return false;
  }
  // The surface only names the replay target; wrapping the swapchain texture
  // records nothing on the window's recorder.
  auto backendTex = skgpu::graphite::BackendTextures::MakeDawn(texture.Get());
  SkSurfaceProps surfaceProps;
  auto surface = SkSurfaces::WrapBackendTexture(
      _recorder, backendTex, DawnUtils::viewColorSpace(_useP3ColorSpace),
      &surfaceProps);
  if (!surface) {
    return false;
  }
  bool success =
      DawnContext::getInstance().insertRecordings(recordings, surface.get());
#ifdef __APPLE__
  dawn::native::metal::WaitForCommandsToBeScheduled(_device.Get());
#endif
  _surface.Present();
  if (success) {
    didPresent();
  }
  return success;
}

bool RNSkWindowSurface::presentImage(const sk_sp<SkImage> &image) {
  if (!canPresent()) {
    return false;
  }
  wgpu::SurfaceTexture surfaceTexture;
  _surface.GetCurrentTexture(&surfaceTexture);
  auto texture = surfaceTexture.texture;
  if (!texture) {
    return false;
  }
  auto backendTex = skgpu::graphite::BackendTextures::MakeDawn(texture.Get());
  SkSurfaceProps surfaceProps;
  auto surface = SkSurfaces::WrapBackendTexture(
      _recorder, backendTex, _colorType,
      DawnUtils::viewColorSpace(_useP3ColorSpace), &surfaceProps);
  if (!surface) {
    return false;
  }
  surface->getCanvas()->drawImage(image, 0, 0);
  auto recording = _recorder->snap();
  if (!recording) {
    throw std::runtime_error("Failed to create graphite recording");
  }
  DawnContext::getInstance().submitRecording(recording.get());
#ifdef __APPLE__
  dawn::native::metal::WaitForCommandsToBeScheduled(_device.Get());
#endif
  _surface.Present();
  didPresent();
  return true;
}

} // namespace RNSkia
