#include "RNDawnWindowContext.h"

#include "RNDawnContext.h"

namespace RNSkia {

void DawnWindowContext::present() {
  auto recording = _recorder->snap();
  if (!recording) {
    throw std::runtime_error("Failed to create graphite recording");
  }
  DawnContext::getInstance().submitRecording(recording.get());
#ifdef __APPLE__
  dawn::native::metal::WaitForCommandsToBeScheduled(_device.Get());
#endif
  _surface.Present();
}

void DawnWindowContext::noteSwapchainCapabilities(wgpu::TextureUsage usage,
                                                  bool highBitDepthSupported) {
  DawnContext::getInstance().noteSwapchainCapabilities(usage,
                                                       highBitDepthSupported);
}

std::optional<RNSkDeferredTarget> DawnWindowContext::getDeferredTarget() {
  int width, height;
  {
    std::lock_guard<std::mutex> lock(_sizeMutex);
    width = _width;
    height = _height;
  }
  if (width <= 0 || height <= 0) {
    return std::nullopt;
  }
  return DawnContext::getInstance().makeDeferredTarget(
      width, height, _format == DawnUtils::HighBitDepthTextureFormat);
}

bool DawnWindowContext::insertRecording(
    skgpu::graphite::Recording *recording) {
  if (_pendingSurface) {
    // Two inserts without a present: the earlier frame is dropped.
    _pendingSurface.reset();
  }
  _surface.GetCurrentTexture(&_pendingTexture);
  auto texture = _pendingTexture.texture;
  if (!texture) {
    return false;
  }
  // Wrap the swapchain texture exactly like getSurface() does so that the
  // texture info matches what makeDeferredTarget() described. The calling
  // thread's Recorder: presenting may happen off the main thread.
  auto backendTex = skgpu::graphite::BackendTextures::MakeDawn(texture.Get());
  SkSurfaceProps surfaceProps;
  _pendingSurface = SkSurfaces::WrapBackendTexture(
      DawnContext::getInstance().getRecorder(), backendTex, _colorType,
      SkColorSpace::MakeSRGB(), &surfaceProps);
  if (!_pendingSurface) {
    return false;
  }
  skgpu::graphite::InsertRecordingInfo info;
  info.fRecording = recording;
  info.fTargetSurface = _pendingSurface.get();
  if (!DawnContext::getInstance().insert(info)) {
    _pendingSurface.reset();
    return false;
  }
  return true;
}

bool DawnWindowContext::presentInserted() {
  if (!_pendingSurface) {
    return false;
  }
#ifdef __APPLE__
  dawn::native::metal::WaitForCommandsToBeScheduled(_device.Get());
#endif
  _surface.Present();
  _pendingSurface.reset();
  _pendingTexture = {};
  return true;
}

bool DawnWindowContext::presentRecording(
    skgpu::graphite::Recording *recording) {
  if (!insertRecording(recording)) {
    return false;
  }
  DawnContext::getInstance().submit();
  return presentInserted();
}

} // namespace RNSkia
