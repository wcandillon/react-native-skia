// Everything that needs a complete Recorder lives here rather than in
// RNSkGraphiteProducer.h (which the view headers include on their own).
#include "RNSkGraphiteProducer.h"

#include <memory>
#include <utility>

#include "RNSkGraphiteTarget.h"
#include "RNSkThreadPool.h"
#include "api/recorder/DrawingCtx.h"
#include "api/recorder/RNRecorder.h"
#include "utils/RNSkLog.h"

#include "include/core/SkCanvas.h"
#include "include/core/SkPicture.h"

namespace RNSkia {

RNSkGraphiteProducer::~RNSkGraphiteProducer() = default;

void RNSkGraphiteProducer::drawContent(SkCanvas *canvas, Recorder *recorder,
                                       const sk_sp<SkPicture> &picture,
                                       float pixelDensity) {
  canvas->clear(SK_ColorTRANSPARENT);
  canvas->save();
  canvas->scale(pixelDensity, pixelDensity);
  if (recorder != nullptr) {
    DrawingCtx ctx(canvas);
    recorder->play(&ctx);
  } else if (picture != nullptr) {
    canvas->drawPicture(picture);
  }
  canvas->restore();
}

void RNSkGraphiteProducer::setTarget(
    std::shared_ptr<RNSkGraphiteTarget> target) {
  std::lock_guard<std::mutex> lock(_mutex);
  _target = std::move(target);
  // A frame presented on the previous target says nothing about this one.
  _presentPending = false;
  _dirty = true;
  kickLocked();
}

void RNSkGraphiteProducer::setRecorder(std::shared_ptr<Recorder> recorder) {
  sk_sp<SkPicture> picture;
  if (recorder != nullptr && recorder->variables.empty()) {
    picture = recorder->makePicture();
    recorder = nullptr;
  }
  replaceContent(std::move(recorder), std::move(picture), /* dirty= */ true);
}

void RNSkGraphiteProducer::setPicture(sk_sp<SkPicture> picture) {
  replaceContent(nullptr, std::move(picture), /* dirty= */ true);
}

void RNSkGraphiteProducer::clear() {
  replaceContent(nullptr, nullptr, /* dirty= */ false);
}

void RNSkGraphiteProducer::replaceContent(std::shared_ptr<Recorder> recorder,
                                          sk_sp<SkPicture> picture,
                                          bool dirty) {
  std::shared_ptr<Recorder> retiredRecorder;
  sk_sp<SkPicture> retiredPicture;
  {
    std::lock_guard<std::mutex> lock(_mutex);
    retiredRecorder = std::exchange(_recorder, std::move(recorder));
    retiredPicture = std::exchange(_picture, std::move(picture));
    _dirty = dirty;
    if (dirty) {
      kickLocked();
    }
  }
  // Both are released here, outside the lock.
}

bool RNSkGraphiteProducer::hasContent() {
  std::lock_guard<std::mutex> lock(_mutex);
  return _recorder != nullptr || _picture != nullptr;
}

bool RNSkGraphiteProducer::applyUpdatesTo(
    const std::shared_ptr<Recorder> &recorder, jsi::Runtime &runtime,
    double recorderId, const jsi::Array &values) {
  if (recorder == nullptr || recorder->id != recorderId) {
    return false;
  }
  // The values are written into the commands by the next replay, which the
  // caller schedules: the mapper never waits for a draw.
  recorder->readUpdates(runtime, values);
  return true;
}

bool RNSkGraphiteProducer::applyUpdates(jsi::Runtime &runtime,
                                        double recorderId,
                                        const jsi::Array &values) {
  std::shared_ptr<Recorder> recorder;
  {
    std::lock_guard<std::mutex> lock(_mutex);
    recorder = _recorder;
  }
  // Outside the lock: a commit replacing the recorder must not wait for the
  // read. Should it land while this runs, the values go into the retired
  // recorder and the commit's own frame draws the new one.
  if (!applyUpdatesTo(recorder, runtime, recorderId, values)) {
    return false;
  }
  std::lock_guard<std::mutex> lock(_mutex);
  _dirty = true;
  kickLocked();
  return true;
}

bool RNSkGraphiteProducer::requestFrame() {
  std::lock_guard<std::mutex> lock(_mutex);
  _dirty = true;
  kickLocked();
  return _target != nullptr && (_recorder != nullptr || _picture != nullptr);
}

void RNSkGraphiteProducer::onFramePresented() {
  std::lock_guard<std::mutex> lock(_mutex);
  _presentPending = false;
  if (_dirty) {
    kickLocked();
  }
}

void RNSkGraphiteProducer::kickLocked() {
  if (_inFlight || _presentPending || _target == nullptr ||
      (_recorder == nullptr && _picture == nullptr)) {
    return;
  }
  _inFlight = true;
  std::weak_ptr<RNSkGraphiteProducer> weakThis = weak_from_this();
  RNSkThreadPool::getInstance().post([weakThis]() {
    if (auto self = weakThis.lock()) {
      self->produce();
    }
  });
}

void RNSkGraphiteProducer::produce() {
  std::shared_ptr<RNSkGraphiteTarget> target;
  std::shared_ptr<Recorder> recorder;
  sk_sp<SkPicture> picture;
  {
    std::lock_guard<std::mutex> lock(_mutex);
    target = _target;
    recorder = _recorder;
    picture = _picture;
    _dirty = false;
  }
  std::shared_ptr<RNSkGraphiteRecording> recording;
  if (target && (recorder || picture)) {
    SkCanvas *canvas = nullptr;
    try {
      canvas = target->beginRecording();
    } catch (const std::exception &) {
      // No surface and no layout yet: the view asks for a frame once it
      // has a size.
    }
    if (canvas != nullptr) {
      try {
        // The deferred canvas already draws in points.
        drawContent(canvas, recorder.get(), picture, /* pixelDensity= */ 1.0f);
      } catch (const std::exception &e) {
        RNSkLogger::logToConsole("Canvas: replaying the scene failed: %s",
                                 e.what());
      }
      try {
        recording = target->finishRecording();
      } catch (const std::exception &e) {
        RNSkLogger::logToConsole("Canvas: recording the frame failed: %s",
                                 e.what());
      }
    }
  }
  std::lock_guard<std::mutex> lock(_mutex);
  _inFlight = false;
  if (recording != nullptr && target != _target) {
    // The target was replaced or released while recording: the frame was
    // recorded for a view that is gone. Record the content again for the
    // current target, if any.
    recording = nullptr;
    _dirty = true;
  }
  if (recording != nullptr) {
    // The next job starts when this frame is on screen. Submitted under the
    // lock: a frame presented in between (a redraw replaying the last one)
    // would otherwise clear the flag before the recording is even queued.
    _presentPending = true;
    target->submit(std::move(recording));
    return;
  }
  // Nothing was recorded: keep the content dirty so that the next request
  // (a surface, a resize) records it. A request that landed while this job
  // ran was only noted as dirty; it starts the next job now.
  const bool requested = _dirty;
  _dirty = true;
  if (requested) {
    kickLocked();
  }
}

void RNSkGraphiteProducer::renderInto(SkCanvas *canvas, float pixelDensity) {
  std::shared_ptr<Recorder> recorder;
  sk_sp<SkPicture> picture;
  {
    std::lock_guard<std::mutex> lock(_mutex);
    recorder = _recorder;
    picture = _picture;
  }
  drawContent(canvas, recorder.get(), picture, pixelDensity);
}

} // namespace RNSkia
