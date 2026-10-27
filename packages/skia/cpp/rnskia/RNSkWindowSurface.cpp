#include "RNSkWindowSurface.h"

#include <algorithm>
#include <exception>
#include <utility>
#include <vector>

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

namespace {

// The windows alive, so that every surface made on a lost GPU device can be
// let go of at once before the device is destroyed (see
// RNSkWindowSurface::retireReplacedDevice). The mutex guards the list, and
// is held for the whole sweep over it, so that no window goes away under
// the sweep; it is never taken with a window's mutex held (see the class
// comment on locks).
std::mutex &windowsMutex() {
  static std::mutex mutex;
  return mutex;
}

std::vector<RNSkWindowSurface *> &windows() {
  static std::vector<RNSkWindowSurface *> list;
  return list;
}

} // namespace

RNSkWindowSurface::RNSkWindowSurface() {
  std::lock_guard<std::mutex> lock(windowsMutex());
  windows().push_back(this);
}

RNSkWindowSurface::~RNSkWindowSurface() {
  // Out of the list before letting go of the surface: the destructor may run
  // on any thread, and the list is swept by the presenting threads (see
  // releaseSurfacesOn).
  {
    std::lock_guard<std::mutex> lock(windowsMutex());
    auto &list = windows();
    list.erase(std::remove(list.begin(), list.end(), this), list.end());
  }
  detach();
}

void RNSkWindowSurface::attach(void *nativeHandle, int width, int height,
                               bool highBitDepth, bool useP3ColorSpace,
                               Releaser releaser) {
  std::lock_guard<std::mutex> lock(_mutex);
  detachLocked();
  _nativeHandle = nativeHandle;
  _releaser = std::move(releaser);
  // Called from the platform view (Java or Objective-C), where an exception
  // would take the process down: without a GPU (reported when the module was
  // installed, see DawnContext::getGpuInfo) the window is given back and the
  // view stays blank.
  auto *context = DawnContext::tryGetInstance();
  if (context == nullptr) {
    detachLocked();
    return;
  }
  _device = context->getWGPUDevice();
  _generation.store(DawnContext::generation(), std::memory_order_release);
  _surface = context->MakeWGPUSurface(nativeHandle);
  if (!_surface) {
    RNSkLogger::logToConsole("Could not create a surface over the window");
    detachLocked();
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
  _usage = supportedSurfaceUsage();
  _needsConfigure = true;
  {
    std::lock_guard<std::mutex> infoLock(_targetInfoMutex);
    _hasPendingSize = false;
  }
  updateTargetInfo();
  requestRedraw();
}

void RNSkWindowSurface::resize(int width, int height) {
  {
    std::lock_guard<std::mutex> lock(_targetInfoMutex);
    if (!_hasTargetInfo) {
      return;
    }
    // What frames are recorded for from now. The window follows on the
    // presenting thread, by its next present (see takePendingSizeLocked):
    // the main thread does not wait for a present in flight.
    _targetInfo.width = width;
    _targetInfo.height = height;
    _pendingWidth = width;
    _pendingHeight = height;
    _hasPendingSize = true;
  }
  requestRedraw();
}

void RNSkWindowSurface::detach() {
  std::lock_guard<std::mutex> lock(_mutex);
  detachLocked();
}

void RNSkWindowSurface::detachLocked() {
  // The surface goes before the window it draws into.
  _surface = nullptr;
  _needsConfigure = false;
  {
    std::lock_guard<std::mutex> infoLock(_targetInfoMutex);
    _hasPendingSize = false;
  }
  _generation.store(0, std::memory_order_release);
  updateTargetInfo();
  if (_releaser && _nativeHandle != nullptr) {
    _releaser(_nativeHandle);
  }
  _releaser = nullptr;
  _nativeHandle = nullptr;
}

bool RNSkWindowSurface::isAttached() {
  std::lock_guard<std::mutex> lock(_mutex);
  return _nativeHandle != nullptr;
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

void RNSkWindowSurface::setHighBitDepth(bool highBitDepth) {
  std::lock_guard<std::mutex> lock(_targetInfoMutex);
  _knownHighBitDepth = highBitDepth;
  _hasKnownHighBitDepth = true;
}

bool RNSkWindowSurface::getHighBitDepth(bool *highBitDepth) {
  std::lock_guard<std::mutex> lock(_targetInfoMutex);
  if (!_hasKnownHighBitDepth) {
    return false;
  }
  *highBitDepth = _knownHighBitDepth;
  return true;
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
  // Kept while the surface is away for a device replacement (see
  // ensureDeviceLocked): the frames recorded meanwhile are for this window.
  if (_nativeHandle == nullptr) {
    _hasTargetInfo = false;
    return;
  }
  _targetInfo = describeLocked();
  // A size resize() noted and the presenting thread has not taken yet is
  // what frames are recorded for.
  if (_hasPendingSize) {
    _targetInfo.width = _pendingWidth;
    _targetInfo.height = _pendingHeight;
  }
  _hasTargetInfo = true;
  // What the surface granted, kept once the window is detached: it is what
  // the window comes back with.
  _knownHighBitDepth = _colorType == DawnUtils::HighBitDepthColorType;
  _hasKnownHighBitDepth = true;
}

RNSkGraphiteTargetInfo RNSkWindowSurface::describeLocked() const {
  RNSkGraphiteTargetInfo info;
  info.width = _width;
  info.height = _height;
  info.colorType = _colorType;
  info.useP3ColorSpace = _useP3ColorSpace;
  info.textureInfo = getTextureInfo();
  return info;
}

skgpu::graphite::TextureInfo RNSkWindowSurface::getTextureInfo() const {
  return skgpu::graphite::TextureInfos::MakeDawn(
      skgpu::graphite::DawnTextureInfo(skgpu::graphite::SampleCount::k1,
                                       skgpu::Mipmapped::kNo, _format, _usage,
                                       wgpu::TextureAspect::All));
}

void RNSkWindowSurface::takePendingSizeLocked() {
  std::lock_guard<std::mutex> lock(_targetInfoMutex);
  if (!_hasPendingSize) {
    return;
  }
  _hasPendingSize = false;
  if (_pendingWidth == _width && _pendingHeight == _height) {
    return;
  }
  _width = _pendingWidth;
  _height = _pendingHeight;
  _needsConfigure = true;
}

void RNSkWindowSurface::configureIfNeededLocked() {
  if (!_needsConfigure) {
    return;
  }
  _needsConfigure = false;
  configureSurface();
}

void RNSkWindowSurface::configureSurface() {
  wgpu::SurfaceConfiguration config;
  config.device = _device;
  config.format = _format;
  config.width = _width;
  config.height = _height;
  config.presentMode = wgpu::PresentMode::Fifo;
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
  std::lock_guard<std::mutex> lock(_mutex);
  return canPresentLocked();
}

bool RNSkWindowSurface::canPresentLocked() {
  // A lost device (see DawnContext::isDeviceLost) takes no frame until it
  // is replaced: the view keeps its last one and the queue waits, as while
  // in the background. A window whose surface is away for the replacement
  // (see ensureDeviceLocked) can: presenting is what brings the surface
  // back.
  return _nativeHandle != nullptr && !DawnContext::isDeviceLost() &&
         (!_canPresent || _canPresent());
}

bool RNSkWindowSurface::isTargetLocked(const RNSkGraphiteTargetInfo &target) {
  if (describeLocked() == target) {
    return true;
  }
  // A frame for the size resize() noted: the window moves on to it now. A
  // frame for the size the window still has goes onto it as it is (above).
  takePendingSizeLocked();
  return describeLocked() == target;
}

void RNSkWindowSurface::retireReplacedDevice() {
  const auto generation = _generation.load(std::memory_order_acquire);
  if (generation == 0 || generation == DawnContext::generation()) {
    return;
  }
  auto *context = DawnContext::tryGetInstance();
  if (context == nullptr) {
    return;
  }
  // Once the sweep is through, no window holds a surface on that device:
  // a window attached meanwhile is configured on the device in use. Two
  // threads retiring the same device both sweep before either destroys it.
  releaseSurfacesOn(generation);
  context->destroyRetiredDevice(generation);
}

void RNSkWindowSurface::releaseSurfacesOn(uint64_t generation) {
  std::lock_guard<std::mutex> listLock(windowsMutex());
  for (auto *window : windows()) {
    std::lock_guard<std::mutex> lock(window->_mutex);
    if (window->_generation.load(std::memory_order_acquire) == generation) {
      window->_surface = nullptr;
      window->_generation.store(0, std::memory_order_release);
    }
  }
}

bool RNSkWindowSurface::ensureDeviceLocked() {
  const auto generation = DawnContext::generation();
  if (_surface) {
    // A surface on a device replaced since the sweep (see
    // retireReplacedDevice) is let go of on the next frame, not configured
    // on a device that is gone.
    return _generation.load(std::memory_order_acquire) == generation;
  }
  auto *context = DawnContext::tryGetInstance();
  if (context == nullptr) {
    return false;
  }
  _device = context->getWGPUDevice();
  _generation.store(generation, std::memory_order_release);
  _surface = context->MakeWGPUSurface(_nativeHandle);
  if (!_surface) {
    RNSkLogger::logToConsole("Could not create a surface over the window");
    return false;
  }
  _usage = supportedSurfaceUsage();
  configureSurface();
  _needsConfigure = false;
  updateTargetInfo();
  return true;
}

skgpu::graphite::Recorder *RNSkWindowSurface::presentRecorder() {
  try {
    return DawnContext::getInstance().getRecorder();
  } catch (const std::exception &e) {
    RNSkLogger::logToConsole("Could not get a recorder to present with: %s",
                             e.what());
    return nullptr;
  }
}

bool RNSkWindowSurface::presentRecordings(
    const RNSkGraphiteTargetInfo &target,
    const std::vector<skgpu::graphite::Recording *> &recordings) {
  retireReplacedDevice();
  std::lock_guard<std::mutex> lock(_mutex);
  // The device check first: it may configure the window again.
  if (!canPresentLocked() || !ensureDeviceLocked() || !isTargetLocked(target)) {
    return false;
  }
  configureIfNeededLocked();
  wgpu::SurfaceTexture surfaceTexture;
  _surface.GetCurrentTexture(&surfaceTexture);
  auto texture = surfaceTexture.texture;
  if (!texture) {
    return false;
  }
  auto *recorder = presentRecorder();
  if (recorder == nullptr) {
    return false;
  }
  // The surface only names the replay target; wrapping the swapchain texture
  // records nothing on the recorder.
  auto backendTex = skgpu::graphite::BackendTextures::MakeDawn(texture.Get());
  SkSurfaceProps surfaceProps;
  auto surface = SkSurfaces::WrapBackendTexture(
      recorder, backendTex, DawnUtils::viewColorSpace(_useP3ColorSpace),
      &surfaceProps);
  if (!surface) {
    return false;
  }
  // A recording Graphite rejects is logged there and dropped: it would be
  // rejected again on every frame, and the frames behind it would never come.
  DawnContext::getInstance().insertRecordings(recordings, surface.get());
#ifdef __APPLE__
  dawn::native::metal::WaitForCommandsToBeScheduled(_device.Get());
#endif
  _surface.Present();
  return true;
}

bool RNSkWindowSurface::presentImage(const RNSkGraphiteTargetInfo &target,
                                     const sk_sp<SkImage> &image) {
  retireReplacedDevice();
  std::lock_guard<std::mutex> lock(_mutex);
  if (!canPresentLocked() || !ensureDeviceLocked() || !isTargetLocked(target)) {
    return false;
  }
  configureIfNeededLocked();
  wgpu::SurfaceTexture surfaceTexture;
  _surface.GetCurrentTexture(&surfaceTexture);
  auto texture = surfaceTexture.texture;
  if (!texture) {
    return false;
  }
  auto *recorder = presentRecorder();
  if (recorder == nullptr) {
    return false;
  }
  auto backendTex = skgpu::graphite::BackendTextures::MakeDawn(texture.Get());
  SkSurfaceProps surfaceProps;
  auto surface = SkSurfaces::WrapBackendTexture(
      recorder, backendTex, _colorType,
      DawnUtils::viewColorSpace(_useP3ColorSpace), &surfaceProps);
  if (!surface) {
    return false;
  }
  drawOnto(surface->getCanvas(), image, surface->width(), surface->height());
  DawnContext::getInstance().submitRecording(recorder);
#ifdef __APPLE__
  dawn::native::metal::WaitForCommandsToBeScheduled(_device.Get());
#endif
  _surface.Present();
  return true;
}

} // namespace RNSkia
