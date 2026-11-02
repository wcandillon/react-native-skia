// Everything that needs a complete Recorder lives here rather than in
// RNSkGraphiteProducer.h (which the view headers include on their own).
#include "RNSkGraphiteProducer.h"

#include <memory>
#include <utility>

#include "RNDawnContext.h"
#include "RNSkGraphiteTarget.h"
#include "RNSkThreadPool.h"
#include "api/recorder/DrawingCtx.h"
#include "api/recorder/RNRecorder.h"
#include "utils/RNSkLog.h"

#include "include/core/SkCanvas.h"
#include "include/core/SkPicture.h"

namespace RNSkia {

namespace {

/**
 The render thread pool, set up on first use to trim the recorders of its
 threads once GPU resources went away (see DawnContext::trimThreadRecorders):
 a view torn down with its content, or textures the image cache let go of.
 A thread that ran no job for RNSkThreadPool::kIdleDelay lets go of all it
 can; one still recording, of what went unused that long.
 */
RNSkThreadPool &renderPool() {
  static RNSkThreadPool &pool = []() -> RNSkThreadPool & {
    auto &threads = RNSkThreadPool::getInstance();
    threads.setIdleTask([](bool idle) {
      // What went away with the request is older than this by the time the
      // task runs, what the views still drawing use is not.
      DawnContext::trimThreadRecorders(RNSkThreadPool::kIdleDelay / 2, idle);
    });
    ImageProvider::setReleaseListener(
        []() { RNSkThreadPool::getInstance().requestIdleTask(); });
    return threads;
  }();
  return pool;
}

} // namespace

RNSkGraphiteProducer::RNSkGraphiteProducer() : _schedule(kReplaysToKeepUp) {}

RNSkGraphiteProducer::~RNSkGraphiteProducer() {
  // The content goes away with the view: what the recorders of the render
  // threads still cache for it is freed once they are idle.
  renderPool().requestIdleTask();
}

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
  std::shared_ptr<RNSkGraphiteTarget> retiredTarget;
  {
    std::lock_guard<std::mutex> lock(_mutex);
    retiredTarget = std::exchange(_target, std::move(target));
    // A target never drops a recording (see produce()): the deferred one goes
    // to the target it was made for.
    if (auto deferred = _schedule.retarget()) {
      retiredTarget->submit(std::move(*deferred));
    }
    _dirty = true;
    kickLocked();
  }
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
  return hasContentLocked();
}

bool RNSkGraphiteProducer::hasFrameComing() {
  std::lock_guard<std::mutex> lock(_mutex);
  return _schedule.hasJobInFlight() || _schedule.hasDeferredRecording() ||
         (_dirty && _target != nullptr && hasContentLocked());
}

bool RNSkGraphiteProducer::hasContentLocked() const {
  // A recording whose shared values have not been read yet is not content:
  // its animated properties are unset, and replaying it would draw them wrong.
  // The view keeps showing the previous frame until the mapper has read them,
  // which schedules the frame that draws it (applyUpdates).
  return (_recorder != nullptr && _recorder->isReady()) || _picture != nullptr;
}

bool RNSkGraphiteProducer::applyUpdatesTo(
    const std::shared_ptr<Recorder> &recorder, jsi::Runtime &runtime,
    double recorderId, const jsi::Array &values) {
  if (recorder == nullptr || recorder->id != recorderId) {
    return false;
  }
  // The values are written into the commands by the next replay, which the
  // caller schedules: the mapper never waits for a draw. A value the
  // recording cannot read (invalid for its prop) leaves its property unset
  // and is reported here, once: an error escaping into the mapper would be
  // fatal and take the other mappers of that frame down with it.
  if (auto error = recorder->readUpdates(runtime, values)) {
    const auto message = "React Native Skia: a shared value could not be "
                         "read, its property stays unset: " +
                         *error;
    try {
      RNSkLogger::errorToJavascriptConsole(runtime, message);
    } catch (const std::exception &) {
      RNSkLogger::logToConsole(message);
    }
  }
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
  return _target != nullptr && hasContentLocked();
}

void RNSkGraphiteProducer::onRecordingsPresented(
    const std::vector<std::shared_ptr<RNSkGraphiteRecording>> &recordings) {
  std::lock_guard<std::mutex> lock(_mutex);
  for (const auto &recording : recordings) {
    if (auto deferred = _schedule.recordingPresented(recording)) {
      _target->submit(std::move(*deferred));
    }
  }
  if (_dirty) {
    kickLocked();
  }
}

void RNSkGraphiteProducer::onPresentTick() {
  std::lock_guard<std::mutex> lock(_mutex);
  _schedule.presentTick();
}

void RNSkGraphiteProducer::onTicksEnded() {
  std::lock_guard<std::mutex> lock(_mutex);
  _schedule.ticksEnded();
}

bool RNSkGraphiteProducer::isReplaying() {
  std::lock_guard<std::mutex> lock(_mutex);
  return _schedule.hasJobInFlight();
}

void RNSkGraphiteProducer::kickLocked() {
  // While the device in use is lost, a job would replay a frame nothing can
  // present. The content stays dirty: the loss listener's redraw and the next
  // update kick the producer once a replacement is in place.
  if (DawnContext::isDeviceLost()) {
    return;
  }
  if (_target != nullptr) {
    while (auto deferred = _schedule.forgetUnpresentable(
               [](const std::shared_ptr<RNSkGraphiteRecording> &recording) {
                 return !recording->isCurrent();
               })) {
      _target->submit(std::move(*deferred));
    }
  }
  if (_target == nullptr || !hasContentLocked() || !_schedule.tryStartJob()) {
    return;
  }
  std::weak_ptr<RNSkGraphiteProducer> weakThis = weak_from_this();
  renderPool().post([weakThis]() {
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
    // A commit may have replaced the content this job was started for with a
    // recording that has not read its values yet: nothing to replay until it
    // has (the read schedules the job), and the content stays dirty below.
    if (hasContentLocked()) {
      recorder = _recorder;
      picture = _picture;
    }
    _dirty = false;
  }
  std::shared_ptr<RNSkGraphiteRecording> recording;
  if (target && (recorder || picture)) {
    SkCanvas *canvas = nullptr;
    // Without a GPU nothing records, and Skia.gpu says why.
    if (auto *context = DawnContext::tryGetInstance()) {
      try {
        // On the recorder of this pool thread: a view holds no recorder of
        // its own (see RNSkGraphiteTarget::beginRecording).
        canvas = target->beginRecording(context->getThreadRecorder());
      } catch (const std::exception &e) {
        RNSkLogger::logToConsole("Canvas: beginning the frame failed: %s",
                                 e.what());
      }
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
  // Submitted under the lock: a present of the recording reported before
  // finishJob() made it the view's recording on the target would be ignored,
  // and the schedule would wait for it forever.
  if (recording != nullptr && target == _target) {
    if (auto ready = _schedule.finishJob(std::move(recording))) {
      target->submit(std::move(*ready));
    }
    // Values that arrived during the replay start the next job as soon as
    // the pacing lets it.
    if (_dirty) {
      kickLocked();
    }
    return;
  }
  _schedule.endJob();
  if (recording != nullptr) {
    // Queued even if the view was bound to another target while this job
    // ran: a target never drops a recording, a later one on the same
    // recorder may depend on resources this one uploads. The new target has
    // none yet.
    target->submit(std::move(recording));
  }
  // Nothing was recorded for the current target: keep the content dirty so
  // that the next request (a surface, a resize) records it. A request that
  // landed while this job ran (binding a new target is one) was only noted
  // as dirty; it starts the next job now.
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
    if (hasContentLocked()) {
      recorder = _recorder;
      picture = _picture;
    }
  }
  drawContent(canvas, recorder.get(), picture, pixelDensity);
}

} // namespace RNSkia
