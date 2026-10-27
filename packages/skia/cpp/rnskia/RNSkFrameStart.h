#pragma once

#include <exception>

class SkCanvas;

namespace RNSkia {

/**
 Begins the frame a job of the producer records (see
 RNSkGraphiteProducer::produce). Without a GPU there is no frame, and nothing
 to say: Skia.gpu says why. Otherwise `begin` opens the recording on the
 context and returns its canvas, or nullptr while the view has no size: the
 view asks for a frame once it has one. A recording that cannot begin
 otherwise (`begin` throws) is a failure, and `logFailure` is told what
 failed: the canvas draws no new frame, and nothing else says why. Returns
 the canvas, or nullptr when there is no frame to record.
 */
template <typename Context, typename Begin, typename LogFailure>
SkCanvas *beginFrame(Context *context, Begin &&begin, LogFailure &&logFailure) {
  if (context == nullptr) {
    return nullptr;
  }
  try {
    return begin(*context);
  } catch (const std::exception &e) {
    logFailure(e.what());
    return nullptr;
  }
}

} // namespace RNSkia
