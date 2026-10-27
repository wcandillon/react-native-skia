#include "RNSkWindowSurface.h"

#include <algorithm>
#include <exception>
#include <utility>
#include <variant>
#include <vector>

#include "RNDawnContext.h"
#include "RNDawnUtils.h"
#include "RNMetalLayerColorSpace.h"
#include "utils/RNSkLog.h"
#include "utils/RNSkOverloaded.h"

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
  // A layout attaches the same window again, which keeps what it shows.
  const auto *attached = std::get_if<Window>(&_attachment);
  const bool showsFrame = _showsFrame && attached != nullptr &&
                          attached->nativeHandle == nativeHandle;
  detachLocked();
  _showsFrame = showsFrame;
  auto &window = _attachment.emplace<Window>();
  window.nativeHandle = nativeHandle;
  window.releaser = std::move(releaser);
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
  window.surface = context->MakeWGPUSurface(nativeHandle);
  if (!window.surface) {
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
    if (surfaceSupportsFormat(window.surface,
                              DawnUtils::HighBitDepthTextureFormat)) {
      _format = DawnUtils::HighBitDepthTextureFormat;
      _colorType = DawnUtils::HighBitDepthColorType;
    } else {
      RNSkLogger::logToConsole(
          "High bit depth was requested but the surface does not support "
          "it, falling back to the 8-bit format");
    }
  }
  _usage = supportedSurfaceUsage(window.surface);
  window.needsConfigure = true;
  {
    std::lock_guard<std::mutex> infoLock(_targetInfoMutex);
    _hasPendingSize = false;
  }
  updateTargetInfo();
  publishAttachedLocked();
  requestRedraw();
}

void RNSkWindowSurface::attachImagePresenter(int width, int height,
                                             bool useP3ColorSpace,
                                             ImagePresenter presenter) {
  std::lock_guard<std::mutex> lock(_mutex);
  detachLocked();
  auto *context = DawnContext::tryGetInstance();
  if (context == nullptr) {
    return;
  }
  // The generation first: a device replaced between the two reads leaves an
  // older generation beside the new device, which the next frame refreshes
  // (see ensureDeviceLocked); the other way round, the presenter would keep
  // the replaced device for good.
  _attachment.emplace<ImageFrames>(
      ImageFrames{std::move(presenter), DawnContext::generation()});
  _device = context->getWGPUDevice();
  _width = width;
  _height = height;
  _useP3ColorSpace = useP3ColorSpace;
  _format = DawnUtils::PreferredTextureFormat;
  _colorType = DawnUtils::PreferedColorType;
  _usage = DawnUtils::DefaultTargetUsage;
  {
    std::lock_guard<std::mutex> infoLock(_targetInfoMutex);
    _hasPendingSize = false;
  }
  updateTargetInfo();
  publishAttachedLocked();
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
  auto *window = std::get_if<Window>(&_attachment);
  if (window != nullptr) {
    // The surface goes before the window it draws into.
    window->surface = nullptr;
  }
  {
    std::lock_guard<std::mutex> infoLock(_targetInfoMutex);
    _hasPendingSize = false;
  }
  _generation.store(0, std::memory_order_release);
  updateTargetInfo();
  if (window != nullptr && window->releaser &&
      window->nativeHandle != nullptr) {
    window->releaser(window->nativeHandle);
  }
  _attachment = std::monostate{};
  _showsFrame = false;
  publishAttachedLocked();
}

bool RNSkWindowSurface::showsFrame() {
  std::lock_guard<std::mutex> lock(_mutex);
  return _showsFrame;
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
  if (!isAttachedLocked()) {
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
  if (auto *window = std::get_if<Window>(&_attachment)) {
    window->needsConfigure = true;
  }
}

void RNSkWindowSurface::configureIfNeededLocked(Window &window) {
  if (!window.needsConfigure) {
    return;
  }
  window.needsConfigure = false;
  configureSurface(window);
}

void RNSkWindowSurface::configureSurface(Window &window) {
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
  window.surface.Configure(&config);
#ifdef __APPLE__
  // The layer is tagged with the gamut the window renders in; float formats
  // need the (gamma-encoded) extended variant so the values display
  // identically to the 8-bit path.
  applyCAMetalLayerColorSpace(window.nativeHandle, _format, _useP3ColorSpace);
#endif
}

wgpu::TextureUsage
RNSkWindowSurface::supportedSurfaceUsage(const wgpu::Surface &surface) {
  wgpu::TextureUsage usage = wgpu::TextureUsage::RenderAttachment;
  wgpu::SurfaceCapabilities capabilities;
  if (surface.GetCapabilities(_device.GetAdapter(), &capabilities) !=
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

bool RNSkWindowSurface::surfaceSupportsFormat(const wgpu::Surface &surface,
                                              wgpu::TextureFormat format) {
  wgpu::SurfaceCapabilities capabilities;
  if (surface.GetCapabilities(_device.GetAdapter(), &capabilities) !=
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

RNSkWindowState RNSkWindowSurface::readState(RNSkGraphiteTargetInfo *info) {
  std::lock_guard<std::mutex> lock(_mutex);
  return readStateLocked(info);
}

RNSkWindowState
RNSkWindowSurface::readStateLocked(RNSkGraphiteTargetInfo *info) {
  // Read from what is attached, not from the description, which detachLocked
  // takes once more before it lets go of the window or the image presenter.
  if (!isAttachedLocked()) {
    return RNSkWindowState::kNone;
  }
  // A lost device (see DawnContext::isDeviceLost) takes no frame until it
  // is replaced: the view keeps its last one and the queue waits. A window
  // whose surface is away for the replacement (see ensureDeviceLocked) is
  // ready: presenting is what brings the surface back.
  if (DawnContext::isDeviceLost()) {
    return RNSkWindowState::kNoDevice;
  }
  if (_canPresent && !_canPresent()) {
    return RNSkWindowState::kCannotPresent;
  }
  if (info != nullptr) {
    std::lock_guard<std::mutex> infoLock(_targetInfoMutex);
    *info = _targetInfo;
  }
  return RNSkWindowState::kReady;
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

void RNSkWindowSurface::retireUnheldDevice(uint64_t generation) {
  {
    std::lock_guard<std::mutex> listLock(windowsMutex());
    for (auto *window : windows()) {
      // Under the window's mutex, so that an attach in progress on that
      // device is through.
      std::lock_guard<std::mutex> lock(window->_mutex);
      if (window->_generation.load(std::memory_order_acquire) == generation) {
        return;
      }
    }
  }
  if (auto *context = DawnContext::tryGetInstance()) {
    context->destroyRetiredDevice(generation);
  }
}

void RNSkWindowSurface::releaseSurfacesOn(uint64_t generation) {
  std::lock_guard<std::mutex> listLock(windowsMutex());
  for (auto *window : windows()) {
    std::lock_guard<std::mutex> lock(window->_mutex);
    if (window->_generation.load(std::memory_order_acquire) == generation) {
      if (auto *attached = std::get_if<Window>(&window->_attachment)) {
        attached->surface = nullptr;
      }
      window->_generation.store(0, std::memory_order_release);
    }
  }
}

bool RNSkWindowSurface::ensureDeviceLocked() {
  const auto generation = DawnContext::generation();
  return std::visit(Overloaded{
                        [](std::monostate) { return false; },
                        [&](Window &window) {
                          return ensureDeviceLocked(window, generation);
                        },
                        [&](ImageFrames &frames) {
                          return ensureDeviceLocked(frames, generation);
                        },
                    },
                    _attachment);
}

bool RNSkWindowSurface::ensureDeviceLocked(Window &window,
                                           uint64_t generation) {
  if (window.surface) {
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
  window.surface = context->MakeWGPUSurface(window.nativeHandle);
  if (!window.surface) {
    RNSkLogger::logToConsole("Could not create a surface over the window");
    return false;
  }
  _usage = supportedSurfaceUsage(window.surface);
  configureSurface(window);
  window.needsConfigure = false;
  updateTargetInfo();
  return true;
}

bool RNSkWindowSurface::ensureDeviceLocked(ImageFrames &frames,
                                           uint64_t generation) {
  if (frames.generation == generation) {
    return true;
  }
  auto *context = DawnContext::tryGetInstance();
  if (context == nullptr) {
    return false;
  }
  _device = context->getWGPUDevice();
  frames.generation = generation;
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
  if (readStateLocked(nullptr) != RNSkWindowState::kReady ||
      !ensureDeviceLocked() || !isTargetLocked(target)) {
    return false;
  }
  return std::visit(Overloaded{
                        [](std::monostate) { return false; },
                        [&](Window &window) {
                          return presentRecordingsLocked(window, recordings);
                        },
                        [&](ImageFrames &frames) {
                          return presentRecordingsLocked(frames, recordings);
                        },
                    },
                    _attachment);
}

bool RNSkWindowSurface::presentRecordingsLocked(
    Window &window,
    const std::vector<skgpu::graphite::Recording *> &recordings) {
  configureIfNeededLocked(window);
  wgpu::SurfaceTexture surfaceTexture;
  window.surface.GetCurrentTexture(&surfaceTexture);
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
  window.surface.Present();
  _showsFrame = true;
  return true;
}

bool RNSkWindowSurface::presentRecordingsLocked(
    ImageFrames &frames,
    const std::vector<skgpu::graphite::Recording *> &recordings) {
  auto imageTarget = makeImageTargetLocked(presentRecorder());
  auto frame = SkSurfaces::AsImage(imageTarget);
  if (frame == nullptr) {
    return false;
  }
  DawnContext::getInstance().insertRecordings(recordings, imageTarget.get());
  showFrameLocked(frames, frame);
  return true;
}

bool RNSkWindowSurface::presentImage(const RNSkGraphiteTargetInfo &target,
                                     const sk_sp<SkImage> &image) {
  retireReplacedDevice();
  std::lock_guard<std::mutex> lock(_mutex);
  if (readStateLocked(nullptr) != RNSkWindowState::kReady ||
      !ensureDeviceLocked() || !isTargetLocked(target)) {
    return false;
  }
  return std::visit(
      Overloaded{
          [](std::monostate) { return false; },
          [&](Window &window) { return presentImageLocked(window, image); },
          [&](ImageFrames &frames) {
            return presentImageLocked(frames, image);
          },
      },
      _attachment);
}

bool RNSkWindowSurface::presentImageLocked(Window &window,
                                           const sk_sp<SkImage> &image) {
  configureIfNeededLocked(window);
  wgpu::SurfaceTexture surfaceTexture;
  window.surface.GetCurrentTexture(&surfaceTexture);
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
  window.surface.Present();
  _showsFrame = true;
  return true;
}

bool RNSkWindowSurface::presentImageLocked(ImageFrames &frames,
                                           const sk_sp<SkImage> &image) {
  auto *recorder = presentRecorder();
  auto imageTarget = makeImageTargetLocked(recorder);
  auto frame = SkSurfaces::AsImage(imageTarget);
  if (frame == nullptr) {
    return false;
  }
  drawOnto(imageTarget->getCanvas(), image, imageTarget->width(),
           imageTarget->height());
  DawnContext::getInstance().submitRecording(recorder);
  showFrameLocked(frames, frame);
  return true;
}

sk_sp<SkSurface>
RNSkWindowSurface::makeImageTargetLocked(skgpu::graphite::Recorder *recorder) {
  if (recorder == nullptr) {
    return nullptr;
  }
  wgpu::TextureDescriptor descriptor;
  descriptor.label = "Static canvas frame";
  descriptor.size = {static_cast<uint32_t>(_width),
                     static_cast<uint32_t>(_height), 1};
  descriptor.format = _format;
  descriptor.usage = _usage;
  auto imageTarget = DawnContext::getInstance().MakeSurfaceFromTexture(
      _device.CreateTexture(&descriptor), recorder,
      DawnUtils::viewColorSpace(_useP3ColorSpace));
  // The frame waits in the queue for the view's next recording or redraw.
  if (imageTarget == nullptr) {
    RNSkLogger::logToConsole(
        "Canvas: could not make a %dx%d texture for a static frame", _width,
        _height);
  }
  return imageTarget;
}

void RNSkWindowSurface::showFrameLocked(ImageFrames &frames,
                                        const sk_sp<SkImage> &frame) {
  frames.presenter(frame);
  _showsFrame = true;
}

} // namespace RNSkia
