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

bool DawnWindowContext::presentRecordings(
    const std::vector<skgpu::graphite::Recording *> &recordings) {
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
      _recorder, backendTex, SkColorSpace::MakeSRGB(), &surfaceProps);
  if (!surface) {
    return false;
  }
  bool success =
      DawnContext::getInstance().insertRecordings(recordings, surface.get());
#ifdef __APPLE__
  dawn::native::metal::WaitForCommandsToBeScheduled(_device.Get());
#endif
  _surface.Present();
  return success;
}

bool DawnWindowContext::presentImage(const sk_sp<SkImage> &image) {
  auto surface = getSurface();
  if (!surface) {
    return false;
  }
  surface->getCanvas()->drawImage(image, 0, 0);
  present();
  return true;
}

} // namespace RNSkia
