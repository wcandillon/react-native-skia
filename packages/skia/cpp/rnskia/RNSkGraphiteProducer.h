#pragma once

#include <memory>
#include <mutex>
#include <vector>

#include <jsi/jsi.h>

#include "RNSkReplaySchedule.h"

#include "include/core/SkRefCnt.h"

class SkCanvas;
class SkPicture;

namespace RNSkia {

namespace jsi = facebook::jsi;

class Recorder;
class RNSkGraphiteRecording;
class RNSkGraphiteTarget;

/**
 * Records the declarative content of a view (a Recorder handed over by
 * <Canvas>, or a picture) into Graphite recordings, on the render thread
 * pool.
 *
 * Three threads meet here. The JS thread hands over the content. A Reanimated
 * mapper, on the UI runtime, reads the shared values into the recorder's
 * pending writes: that is the only step that needs a JS runtime, and it never
 * waits for a replay. A pool thread replays the commands (the recorder writes
 * the pending values into them first) into a deferred canvas of the view's
 * target, on the Graphite recorder of that thread (a view holds none of its
 * own, see RNSkGraphiteTarget::beginRecording), and submits the recording;
 * the view presents it on its next frame (see RNSkView::presentFrame).
 *
 * A recording with shared values arrives without their values (recording
 * reads none, see Variables) and is not replayed before the mapper has read
 * them once (Recorder::isReady): the view keeps showing its previous frame
 * until then, one UI frame at most, rather than a frame with unset
 * properties.
 *
 * Pacing: when a job may start and where its recording goes is the
 * RNSkReplaySchedule's. Updates that arrive meanwhile only mark the content
 * dirty; the next job (started by the update, by the end of the job before,
 * or by a presented recording) picks them up. A producer that outruns the
 * display therefore records once per vsync, and the target never holds more
 * than one of its recordings.
 */
class RNSkGraphiteProducer
    : public std::enable_shared_from_this<RNSkGraphiteProducer> {
public:
  RNSkGraphiteProducer();
  ~RNSkGraphiteProducer();

  /**
   The target to record into. JS thread (the registry side, see
   RNSkView::setNativeId).
   */
  void setTarget(std::shared_ptr<RNSkGraphiteTarget> target);

  /**
   Takes ownership of the recorder (or releases it with nullptr). A recording
   without shared values is played once into a picture: nothing will ever
   update it, and drawing a picture is cheaper than replaying commands. The
   recorder is owned here rather than by a JS wrapper: its commands hold
   every native resource the canvas draws (images, pictures, paths), and
   tying their lifetime to the garbage collector of a runtime that rarely
   allocates (the UI runtime) kept them resident long after unmount.
   */
  void setRecorder(std::shared_ptr<Recorder> recorder);

  /** Content from the static container: a picture to replay. */
  void setPicture(sk_sp<SkPicture> picture);

  bool hasContent();

  /**
   Whether a frame is on its way: one is being recorded, waits for the view
   to present the one before it, or was asked for and starts once there is
   room for it (see requestFrame). The view drops a frame recorded for a
   size the surface no longer has when one is.
   */
  bool hasFrameComing();

  /**
   Reads the shared values on the calling runtime into the recorder and
   schedules a frame. Returns false when there is no recorder to update, or
   another recording than recorderId (a stale mapper).
   */
  bool applyUpdates(jsi::Runtime &runtime, double recorderId,
                    const jsi::Array &values);

  /**
   Same as applyUpdates(), for a recording that no view owns yet (one queued
   in the view registry until its view registers).
   */
  static bool applyUpdatesTo(const std::shared_ptr<Recorder> &recorder,
                             jsi::Runtime &runtime, double recorderId,
                             const jsi::Array &values);

  /**
   Marks the content dirty and schedules a frame if one can start. Returns
   whether a frame is coming at all: there is content and a target to record
   it into.
   */
  bool requestFrame();

  /**
   The view is done with these recordings, taken off its target: presented,
   or skipped as ones it cannot replay. Present thread.
   */
  void onRecordingsPresented(
      const std::vector<std::shared_ptr<RNSkGraphiteRecording>> &recordings);

  /**
   The view's present tick ended: the platform asked it to present, once a
   frame, while a frame of it was waiting or coming. Present thread.
   */
  void onPresentTick();

  /**
   The view asked for no more frames: nothing of it was waiting or coming
   (see RNSkReplaySchedule::ticksEnded). Present thread.
   */
  void onTicksEnded();

  /** Whether a replay is in flight: its frame is coming. Any thread. */
  bool isReplaying();

  /**
   Replays the current content into a canvas, on the calling thread (a
   snapshot). The canvas draws in pixels, this applies the density.
   */
  void renderInto(SkCanvas *canvas, float pixelDensity);

private:
  // Replays that must keep up, with none outlasting a frame since, before
  // the view waits for its presents again (see RNSkReplaySchedule): half a
  // second at 60 Hz.
  static constexpr size_t kReplaysToKeepUp = 30;

  /**
   Replays declarative content, a recorder if there is one, else a picture,
   into a canvas: clears it and applies the density.
   */
  static void drawContent(SkCanvas *canvas, Recorder *recorder,
                          const sk_sp<SkPicture> &picture, float pixelDensity);

  /**
   Swaps the content under the lock and releases the previous one outside of
   it: a pool thread still replaying it keeps it alive until it is done, and
   the last owner, whichever thread that is, releases its resources. Pending
   writes go away with their recorder.
   */
  void replaceContent(std::shared_ptr<Recorder> recorder,
                      sk_sp<SkPicture> picture, bool dirty);
  /**
   Whether there is something to replay: a picture, or a recorder that has
   read its shared values (see Recorder::isReady). Under the lock.
   */
  bool hasContentLocked() const;
  void kickLocked();
  void produce();

  // Content and scheduling state.
  std::mutex _mutex;
  std::shared_ptr<RNSkGraphiteTarget> _target;
  std::shared_ptr<Recorder> _recorder;
  sk_sp<SkPicture> _picture;
  bool _dirty = false;
  RNSkReplaySchedule<std::shared_ptr<RNSkGraphiteRecording>> _schedule;
};

} // namespace RNSkia
