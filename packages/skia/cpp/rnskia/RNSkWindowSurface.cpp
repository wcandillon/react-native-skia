#include "RNSkWindowSurface.h"

#include <algorithm>
#include <exception>
#include <utility>
#include <vector>

#include "RNDawnContext.h"
#include "RNDawnUtils.h"
#include "RNMetalLayerColorSpace.h"
#include "RNSkGpuActivity.h"
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
// RNSkWindowSurface::releaseSurfacesOn). The mutex guards the list, and
// is held for the whole sweep over it, so that no window goes away under
// it (see the class comment on locks). Never destroyed: the presenting
// thread sweeps the list from the task the replacement of a lost device
// posts, and a loss can be reported during process teardown.
std::mutex &windowsMutex() {
  static auto *mutex = new std::mutex();
  return *mutex;
}

std::vector<RNSkWindowSurface *> &windows() {
  static auto *list = new std::vector<RNSkWindowSurface *>();
  return *list;
}

} // namespace

RNSkWindowSurface::RNSkWindowSurface() {
  std::lock_guard<std::mutex> lock(windowsMutex());
  windows().push_back(this);
}

RNSkWindowSurface::~RNSkWindowSurface() {
  // Out of the list before letting go of the surface: the destructor runs
  // wherever the last owner lets go of the window, and the list is swept on
  // the presenting thread (see releaseSurfacesOn).
  {
    std::lock_guard<std::mutex> lock(windowsMutex());
    auto &list = windows();
    list.erase(std::remove(list.begin(), list.end(), this), list.end());
  }
  detachNow();
}

void RNSkWindowSurface::attach(void *nativeHandle, int width, int height,
                               bool highBitDepth, bool useP3ColorSpace,
                               Releaser releaser) {
  RNSURFACE_ASSERT_THREAD(_presentingThread, "RNSkWindowSurface::attach");
  // A layout attaches the same window again, which keeps what it shows.
  const auto *previous = std::get_if<Window>(&_attachment);
  const bool showsFrame = _showsFrame && previous != nullptr &&
                          previous->nativeHandle == nativeHandle;
  // Not detach(): an abandon that lands while this runs (the platform taking
  // the window back as it attaches) must be kept for the detach posted
  // behind, not taken down here.
  releaseAttachment();
  _showsFrame = showsFrame;
  auto &window =
      _attachment.emplace<Window>(Window{nativeHandle, std::move(releaser)});
  // Called from the platform view (Java or Objective-C), where an exception
  // would take the process down: without a GPU (probed the first time the
  // GPU is asked for, see DawnContext::getGpuInfo) the window is given back
  // and the view stays blank.
  auto *context = DawnContext::tryGetInstance();
  if (context == nullptr) {
    releaseAttachment();
    return;
  }
  _device = context->getWGPUDevice();
  const auto generation = DawnContext::generation();
  auto surface = context->MakeWGPUSurface(nativeHandle);
  if (!surface) {
    RNSkLogger::logToConsole("Could not create a surface over the window");
    releaseAttachment();
    return;
  }
  window.surface = DawnSurface{std::move(surface), generation};
  _width = width;
  _height = height;
  _useP3ColorSpace = useP3ColorSpace;
  _format = DawnUtils::PreferredTextureFormat;
  _colorType = DawnUtils::PreferedColorType;
  if (highBitDepth) {
    if (surfaceSupportsFormat(window.surface->handle,
                              DawnUtils::HighBitDepthTextureFormat)) {
      _format = DawnUtils::HighBitDepthTextureFormat;
      _colorType = DawnUtils::HighBitDepthColorType;
    } else {
      RNSkLogger::logToConsole(
          "High bit depth was requested but the surface does not support "
          "it, falling back to the 8-bit format");
    }
  }
  _usage = supportedSurfaceUsage(window.surface->handle);
  window.needsConfigure = true;
  {
    std::lock_guard<std::mutex> infoLock(_targetInfoMutex);
    _hasPendingSize = false;
  }
  updateTargetInfo();
  requestRedraw();
}

void RNSkWindowSurface::attachImagePresenter(int width, int height,
                                             bool useP3ColorSpace,
                                             ImagePresenter presenter) {
  RNSURFACE_ASSERT_THREAD(_presentingThread,
                          "RNSkWindowSurface::attachImagePresenter");
  // Not detach(): an abandon that lands while this runs must be kept for the
  // detach posted behind, not taken down here.
  releaseAttachment();
  auto *context = DawnContext::tryGetInstance();
  if (context == nullptr) {
    return;
  }
  // The generation first: a device replaced between the two reads leaves an
  // older generation beside the new device, which the next frame refreshes
  // (see ensureDevice); the other way round, the presenter would keep the
  // replaced device for good.
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
  requestRedraw();
}

void RNSkWindowSurface::resize(int width, int height) {
  {
    std::lock_guard<std::mutex> lock(_targetInfoMutex);
    if (!_hasTargetInfo) {
      return;
    }
    // What frames are recorded for from now. The window follows by its next
    // present (see takePendingSize).
    _targetInfo.width = width;
    _targetInfo.height = height;
    _pendingWidth = width;
    _pendingHeight = height;
    _hasPendingSize = true;
  }
  requestRedraw();
}

void RNSkWindowSurface::detach() {
  RNSURFACE_ASSERT_THREAD(_presentingThread, "RNSkWindowSurface::detach");
  detachNow();
}

void RNSkWindowSurface::detach(void *nativeHandle) {
  RNSURFACE_ASSERT_THREAD(_presentingThread, "RNSkWindowSurface::detach");
  const auto *window = std::get_if<Window>(&_attachment);
  if (nativeHandle != nullptr && window != nullptr &&
      window->nativeHandle == nativeHandle) {
    detachNow();
  }
}

void RNSkWindowSurface::detachNow() {
  releaseAttachment();
  // The window the platform took back is let go of now (see abandon). Only
  // here, not in attach(): an abandon is always followed by this detach,
  // and an attach for another window comes behind it.
  _abandoned.store(false, std::memory_order_release);
}

void RNSkWindowSurface::releaseAttachment() {
  auto released = std::exchange(_attachment, std::monostate{});
  {
    std::lock_guard<std::mutex> infoLock(_targetInfoMutex);
    _hasPendingSize = false;
  }
  updateTargetInfo();
  std::visit(Overloaded{
                 [](std::monostate &) {},
                 [](Window &window) {
                   // The surface goes before the window it draws into.
                   window.surface.reset();
                   if (window.releaser) {
                     window.releaser(window.nativeHandle);
                   }
                 },
                 [](ImageFrames &) {},
             },
             released);
  _showsFrame = false;
}

void RNSkWindowSurface::abandon() {
  _abandoned.store(true, std::memory_order_release);
}

bool RNSkWindowSurface::isAttached() {
  RNSURFACE_ASSERT_THREAD(_presentingThread, "RNSkWindowSurface::isAttached");
  return !std::holds_alternative<std::monostate>(_attachment);
}

bool RNSkWindowSurface::showsFrame() {
  RNSURFACE_ASSERT_THREAD(_presentingThread, "RNSkWindowSurface::showsFrame");
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

void RNSkWindowSurface::setUseP3ColorSpace(bool useP3ColorSpace) {
  std::lock_guard<std::mutex> lock(_targetInfoMutex);
  _knownUseP3ColorSpace = useP3ColorSpace;
  _hasKnownUseP3ColorSpace = true;
}

bool RNSkWindowSurface::getUseP3ColorSpace(bool *useP3ColorSpace) {
  std::lock_guard<std::mutex> lock(_targetInfoMutex);
  if (!_hasKnownUseP3ColorSpace) {
    return false;
  }
  *useP3ColorSpace = _knownUseP3ColorSpace;
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
  // ensureDevice): the frames recorded meanwhile are for this window.
  if (std::holds_alternative<std::monostate>(_attachment)) {
    _hasTargetInfo = false;
    return;
  }
  _targetInfo = describe();
  // A size resize() noted and no present has taken yet is what frames are
  // recorded for.
  if (_hasPendingSize) {
    _targetInfo.width = _pendingWidth;
    _targetInfo.height = _pendingHeight;
  }
  _hasTargetInfo = true;
  // What the surface granted, kept once the window is detached: it is what
  // the window comes back with.
  _knownHighBitDepth = _colorType == DawnUtils::HighBitDepthColorType;
  _hasKnownHighBitDepth = true;
  _knownUseP3ColorSpace = _useP3ColorSpace;
  _hasKnownUseP3ColorSpace = true;
}

RNSkGraphiteTargetInfo RNSkWindowSurface::describe() const {
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

void RNSkWindowSurface::takePendingSize() {
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

void RNSkWindowSurface::configureIfNeeded(Window &window) {
  if (!window.needsConfigure) {
    return;
  }
  window.needsConfigure = false;
  configureSurface(window);
}

void RNSkWindowSurface::configureSurface(const Window &window) {
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
  window.surface->handle.Configure(&config);
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
  RNSURFACE_ASSERT_THREAD(_presentingThread, "RNSkWindowSurface::readState");
  // Whether a window or an image presenter is attached is the attachment,
  // not its description, which detach() takes once more before it lets go of
  // it.
  if (std::holds_alternative<std::monostate>(_attachment)) {
    return RNSkWindowState::kNone;
  }
  // A lost device (see DawnContext::isDeviceLost) takes no frame until it
  // is replaced: the view keeps its last one and the queue waits. A window
  // whose surface is away for the replacement (see ensureDevice) is ready:
  // presenting is what brings the surface back.
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

bool RNSkWindowSurface::isTarget(const RNSkGraphiteTargetInfo &target) {
  if (describe() == target) {
    return true;
  }
  // A frame for the size resize() noted: the window moves on to it now. A
  // frame for the size the window still has goes onto it as it is (above).
  takePendingSize();
  return describe() == target;
}

void RNSkWindowSurface::presentAsImages() {
  std::lock_guard<std::mutex> listLock(windowsMutex());
  auto &list = windows();
  list.erase(std::remove(list.begin(), list.end(), this), list.end());
}

void RNSkWindowSurface::releaseSurfacesOn(uint64_t generation) {
  std::lock_guard<std::mutex> listLock(windowsMutex());
  for (auto *window : windows()) {
    RNSURFACE_ASSERT_THREAD(window->_presentingThread,
                            "RNSkWindowSurface::releaseSurfacesOn");
    auto *attached = std::get_if<Window>(&window->_attachment);
    if (attached != nullptr && attached->surface &&
        attached->surface->generation == generation) {
      attached->surface.reset();
    }
  }
}

bool RNSkWindowSurface::ensureDevice() {
  const auto generation = DawnContext::generation();
  return std::visit(Overloaded{
                        [](std::monostate &) { return false; },
                        [this, generation](Window &window) {
                          return ensureDevice(window, generation);
                        },
                        [this, generation](ImageFrames &frames) {
                          return ensureDevice(frames, generation);
                        },
                    },
                    _attachment);
}

bool RNSkWindowSurface::ensureDevice(Window &window, uint64_t generation) {
  if (window.surface) {
    return true;
  }
  auto *context = DawnContext::tryGetInstance();
  if (context == nullptr) {
    return false;
  }
  _device = context->getWGPUDevice();
  auto surface = context->MakeWGPUSurface(window.nativeHandle);
  if (!surface) {
    RNSkLogger::logToConsole("Could not create a surface over the window");
    return false;
  }
  window.surface = DawnSurface{std::move(surface), generation};
  _usage = supportedSurfaceUsage(window.surface->handle);
  configureSurface(window);
  window.needsConfigure = false;
  updateTargetInfo();
  return true;
}

bool RNSkWindowSurface::ensureDevice(ImageFrames &frames, uint64_t generation) {
  // The frames are made in textures of their own: the device is the one in
  // use, taken again when it was replaced.
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
  RNSURFACE_ASSERT_THREAD(_presentingThread,
                          "RNSkWindowSurface::presentRecordings");
  RNSkGpuActivity::Scope activity;
  // The device check first: it may configure the window again.
  if (!canPresent() || !ensureDevice() || !isTarget(target)) {
    return false;
  }
  return std::visit(Overloaded{
                        [](std::monostate &) { return false; },
                        [this, &recordings](Window &window) {
                          return presentRecordings(window, recordings);
                        },
                        [this, &recordings](ImageFrames &frames) {
                          return presentRecordings(frames, recordings);
                        },
                    },
                    _attachment);
}

bool RNSkWindowSurface::presentRecordings(
    Window &window,
    const std::vector<skgpu::graphite::Recording *> &recordings) {
  configureIfNeeded(window);
  wgpu::SurfaceTexture surfaceTexture;
  window.surface->handle.GetCurrentTexture(&surfaceTexture);
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
  return presentTexture(window);
}

bool RNSkWindowSurface::presentRecordings(
    ImageFrames &frames,
    const std::vector<skgpu::graphite::Recording *> &recordings) {
  auto imageTarget = makeImageTarget(frames);
  if (imageTarget == nullptr) {
    return false;
  }
  auto frame = SkSurfaces::AsImage(imageTarget);
  if (frame == nullptr ||
      !DawnContext::getInstance().insertRecordings(
          recordings, imageTarget.get(), frames.generation)) {
    return false;
  }
  showFrame(frames, frame);
  return true;
}

bool RNSkWindowSurface::presentImage(const RNSkGraphiteTargetInfo &target,
                                     const sk_sp<SkImage> &image) {
  RNSURFACE_ASSERT_THREAD(_presentingThread, "RNSkWindowSurface::presentImage");
  RNSkGpuActivity::Scope activity;
  if (!canPresent() || !ensureDevice() || !isTarget(target)) {
    return false;
  }
  return std::visit(Overloaded{
                        [](std::monostate &) { return false; },
                        [this, &image](Window &window) {
                          return presentImage(window, image);
                        },
                        [this, &image](ImageFrames &frames) {
                          return presentImage(frames, image);
                        },
                    },
                    _attachment);
}

bool RNSkWindowSurface::presentImage(Window &window,
                                     const sk_sp<SkImage> &image) {
  configureIfNeeded(window);
  wgpu::SurfaceTexture surfaceTexture;
  window.surface->handle.GetCurrentTexture(&surfaceTexture);
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
  return presentTexture(window);
}

bool RNSkWindowSurface::presentImage(ImageFrames &frames,
                                     const sk_sp<SkImage> &image) {
  auto imageTarget = makeImageTarget(frames);
  if (imageTarget == nullptr) {
    return false;
  }
  auto frame = SkSurfaces::AsImage(imageTarget);
  if (frame == nullptr) {
    return false;
  }
  drawOnto(imageTarget->getCanvas(), image, imageTarget->width(),
           imageTarget->height());
  // The recorder is the frames' device's (see makeImageTarget): the submit
  // refuses it once that device is lost or replaced.
  if (!DawnContext::getInstance().submitRecording(imageTarget->recorder())) {
    return false;
  }
  showFrame(frames, frame);
  return true;
}

bool RNSkWindowSurface::canPresent() {
  return readState(nullptr) == RNSkWindowState::kReady &&
         !_abandoned.load(std::memory_order_acquire);
}

bool RNSkWindowSurface::presentTexture(const Window &window) {
#ifdef __APPLE__
  dawn::native::metal::WaitForCommandsToBeScheduled(_device.Get());
#endif
  // The platform is taking the window back (see abandon, set before the
  // detach that clears it is posted, so always ahead of this check): the
  // frame is lost with it, and the device is kept. The recordings were
  // replayed all the same; the caller keeps them and replays them again onto
  // the next window (see presentRecordings).
  if (_abandoned.load(std::memory_order_acquire)) {
    return false;
  }
  window.surface->handle.Present();
  _showsFrame = true;
  return true;
}

sk_sp<SkSurface> RNSkWindowSurface::makeImageTarget(const ImageFrames &frames) {
  DawnContext::RecorderRef recorder;
  try {
    recorder = DawnContext::getInstance().getThreadRecorder();
  } catch (const std::exception &e) {
    RNSkLogger::logToConsole("Could not get a recorder to present with: %s",
                             e.what());
    return nullptr;
  }
  // A device replaced since ensureDevice(): the next frame is made on the
  // new one.
  if (recorder.generation != frames.generation) {
    return nullptr;
  }
  wgpu::TextureDescriptor descriptor;
  descriptor.label = "Static canvas frame";
  descriptor.size = {static_cast<uint32_t>(_width),
                     static_cast<uint32_t>(_height), 1};
  descriptor.format = _format;
  descriptor.usage = _usage;
  auto imageTarget = DawnContext::getInstance().MakeSurfaceFromTexture(
      _device.CreateTexture(&descriptor), recorder.recorder,
      DawnUtils::viewColorSpace(_useP3ColorSpace));
  // The frame stays queued: the view's next redraw presents it, or its next
  // recording once the producer has room to make one.
  if (imageTarget == nullptr) {
    RNSkLogger::logToConsole(
        "Canvas: could not make a %dx%d texture for a static frame", _width,
        _height);
  }
  return imageTarget;
}

void RNSkWindowSurface::showFrame(const ImageFrames &frames,
                                  const sk_sp<SkImage> &frame) {
  frames.presenter(frame);
  _showsFrame = true;
}

} // namespace RNSkia
