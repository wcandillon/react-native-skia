#include "DawnWindowContext.h"

#include "DawnContext.h"

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

} // namespace RNSkia