// Everything that needs a complete Recorder lives here rather than in
// RNSkGraphiteProducer.h (which the view headers include on their own).
#include "RNSkGraphiteProducer.h"

#include <algorithm>
#include <memory>
#include <utility>
#include <vector>

#include "RNDawnContext.h"
#include "RNSkGraphiteTarget.h"
#include "RNSkThreadPool.h"
#include "api/recorder/DrawingCtx.h"
#include "api/recorder/RNRecorder.h"
#include "rnsurface/FrameClock.h"
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

RNSkGraphiteProducer::RNSkGraphiteProducer(Scheduler::Policy policy)
    : _scheduler(policy), _lane(renderPool().acquireLane()) {}

RNSkGraphiteProducer::~RNSkGraphiteProducer() {
  auto &pool = renderPool();
  pool.releaseLane(_lane);
  // The content goes away with the view: what the recorder of its render
  // thread still caches for it is freed once the thread is idle.
  pool.requestIdleTask();
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
    // A frame still queued on the previous target is not coming through this
    // view anymore (the view unbound itself from it): do not wait for it.
    // The recording that waited behind it was made for that target too, and
    // goes there: a target never drops a recording.
    if (_waiting != nullptr && retiredTarget != nullptr) {
      retiredTarget->submit(std::move(_waiting));
    }
    _ready = nullptr;
    _waiting = nullptr;
    _taken.reset();
    _dirty = true;
    applyLocked(_scheduler.onRecordingsForgotten(rnsurface::frameClockNow()));
    requestRecordingLocked();
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
      requestRecordingLocked();
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
  return _scheduler.isRecording() || _waiting != nullptr ||
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
  requestRecordingLocked();
  return true;
}

bool RNSkGraphiteProducer::requestFrame() {
  std::lock_guard<std::mutex> lock(_mutex);
  _dirty = true;
  requestRecordingLocked();
  return _target != nullptr && hasContentLocked();
}

void RNSkGraphiteProducer::setWindow(Scheduler::Window window) {
  std::lock_guard<std::mutex> lock(_mutex);
  _scheduler.setWindow(window);
}

void RNSkGraphiteProducer::cancelFrames() {
  std::lock_guard<std::mutex> lock(_mutex);
  _scheduler.cancel();
}

bool RNSkGraphiteProducer::wantsFrameSignal() {
  std::lock_guard<std::mutex> lock(_mutex);
  return _scheduler.wantsFrameSignal();
}

void RNSkGraphiteProducer::onFramesTaken(
    const std::vector<std::shared_ptr<RNSkGraphiteRecording>> &recordings) {
  std::lock_guard<std::mutex> lock(_mutex);
  if (_ready == nullptr || std::find(recordings.begin(), recordings.end(),
                                     _ready) == recordings.end()) {
    return;
  }
  _taken = _ready;
  _ready = nullptr;
  applyLocked(_scheduler.onReadyFrameTaken(rnsurface::frameClockNow()));
}

void RNSkGraphiteProducer::onFramesReturned(
    const std::vector<std::shared_ptr<RNSkGraphiteRecording>> &recordings) {
  std::lock_guard<std::mutex> lock(_mutex);
  auto taken = _taken.lock();
  _taken.reset();
  // A recording that became the ready one meanwhile keeps the slot: the one
  // given back is on the target ahead of it, and goes first all the same.
  if (taken == nullptr || _ready != nullptr ||
      std::find(recordings.begin(), recordings.end(), taken) ==
          recordings.end()) {
    return;
  }
  _ready = std::move(taken);
  _scheduler.onReadyFrameReturned();
}

void RNSkGraphiteProducer::requestRecordingLocked() {
  if (_target == nullptr || !hasContentLocked()) {
    return;
  }
  forgetUnpresentableLocked();
  applyLocked(_scheduler.onRecordingRequested(rnsurface::frameClockNow()));
}

void RNSkGraphiteProducer::forgetUnpresentableLocked() {
  // Not waited for: the target dropped it with every other recording made
  // for that device (see RNSkGraphiteTarget::submit), or the view skips it.
  if (_ready != nullptr && !_ready->isCurrent()) {
    _ready = nullptr;
    applyLocked(_scheduler.onReadyFrameTaken(rnsurface::frameClockNow()));
  }
}

void RNSkGraphiteProducer::queueReadyLocked() {
  // Submitted under the lock, so that the view finds the ready recording
  // known by the time it takes it off the target (see onFramesTaken).
  if (_target != nullptr && _target->submit(_ready)) {
    return;
  }
  _ready = nullptr;
  applyLocked(_scheduler.onReadyFrameTaken(rnsurface::frameClockNow()));
}

void RNSkGraphiteProducer::applyLocked(const Scheduler::Actions &actions) {
  if (actions.queueRecording && _ready == nullptr && _waiting != nullptr) {
    // The recording that waited for the window to take the one before it.
    _ready = std::move(_waiting);
    _waiting = nullptr;
    queueReadyLocked();
  }
  if (actions.startRecording) {
    std::weak_ptr<RNSkGraphiteProducer> weakThis = weak_from_this();
    // Always on the same thread (see RNSkThreadPool::acquireLane), so that
    // the frames of this view find a warm recorder.
    renderPool().post(_lane, [weakThis]() {
      if (auto self = weakThis.lock()) {
        self->produce();
      }
    });
  }
}

void RNSkGraphiteProducer::produce() {
  // The duration of the job is one of the scheduler's inputs: what it
  // measures against a frame of the display.
  const auto startedAt = rnsurface::frameClockNow();
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
        // On the recorder of this pool thread, the same for every frame of
        // the view: a view holds no recorder of its own (see
        // RNSkGraphiteTarget::beginRecording).
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
  const auto now = rnsurface::frameClockNow();
  if (recording != nullptr && target == _target) {
    const auto actions =
        _scheduler.onRecordingEnded(now, now - startedAt, /* produced= */ true);
    if (actions.queueRecording) {
      _ready = std::move(recording);
      queueReadyLocked();
    } else {
      // The window has not taken the recording before this one: it waits
      // here, and no job starts meanwhile (see onFramesTaken).
      _waiting = std::move(recording);
    }
    // Values that arrived during the replay start the next job right away
    // when the view runs a frame deeper than the window, once the window
    // took the ready recording otherwise.
    Scheduler::Actions next;
    next.startRecording = actions.startRecording;
    applyLocked(next);
    return;
  }
  if (recording != nullptr) {
    // Queued even though the view was bound to another target while this
    // job ran: a target never drops a recording, a later one on the same
    // recorder may depend on resources this one uploads. The new target has
    // none yet.
    target->submit(std::move(recording));
  }
  // Nothing was recorded for the current target: keep the content dirty so
  // that the next request (a surface, a resize) records it. A request that
  // landed while this job ran (binding a new target is one) was only noted;
  // it starts the next job now.
  _dirty = true;
  applyLocked(
      _scheduler.onRecordingEnded(now, now - startedAt, /* produced= */ false));
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
