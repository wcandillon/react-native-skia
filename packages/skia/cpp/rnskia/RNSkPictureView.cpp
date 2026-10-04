// The recorder headers depend on the include order established by
// JsiSkApi.h, so everything that needs a complete Recorder lives here rather
// than in RNSkPictureView.h (which platform views include on its own).
#include "api/JsiSkApi.h"

#include "RNSkPictureView.h"

#include "api/recorder/DrawingCtx.h"
#include "api/recorder/RNRecorder.h"

namespace RNSkia {

void RNSkPictureRenderer::setRecorder(std::shared_ptr<Recorder> recorder,
                                     bool requestRedraw) {
  sk_sp<SkPicture> picture;
  if (recorder != nullptr && recorder->variables.empty()) {
    picture = recorder->makePicture();
    recorder = nullptr;
  }
  std::shared_ptr<Recorder> retired;
  {
    std::lock_guard<std::mutex> lock(_mutex);
    retired = std::move(_recorder);
    _recorder = std::move(recorder);
    _picture = std::move(picture);
  }
  retired = nullptr;
  if (requestRedraw) {
    _requestRedraw();
  }
}

bool RNSkPictureRenderer::applyUpdatesTo(
    const std::shared_ptr<Recorder> &recorder, jsi::Runtime &runtime,
    double recorderId, const jsi::Array &values) {
  if (recorder == nullptr || recorder->id != recorderId) {
    return false;
  }
  recorder->applyUpdates(runtime, values);
  return true;
}

bool RNSkPictureRenderer::applyUpdates(jsi::Runtime &runtime, double recorderId,
                                       const jsi::Array &values) {
  std::shared_ptr<Recorder> recorder;
  {
    std::lock_guard<std::mutex> lock(_mutex);
    recorder = _recorder;
  }
  // Outside the renderer lock: a commit replacing the recorder must not wait
  // for the update. Should it land while this runs, the update goes into the
  // retired recorder and the redraw that follows draws the new one.
  return applyUpdatesTo(recorder, runtime, recorderId, values);
}

void RNSkPictureRenderer::replay(SkCanvas *canvas, Recorder *recorder) {
  DrawingCtx ctx(canvas);
  recorder->play(&ctx);
}

} // namespace RNSkia
