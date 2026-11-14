#pragma once

#include <memory>
#include <mutex>
#include <utility>
#include <vector>

#include <jsi/jsi.h>

#include "rnsurface/FrameScheduler.h"

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
 * waits for a replay. A pool thread, the same one for every frame of the view
 * (see RNSkThreadPool::acquireLane), replays the commands (the recorder
 * writes the pending values into them first) into a deferred canvas of the
 * view's target, on the Graphite recorder of that thread (a view holds none
 * of its own, see RNSkGraphiteTarget::beginRecording), and submits the
 * recording; the main thread presents it on the next vsync.
 *
 * A recording with shared values arrives without their values (recording
 * reads none, see Variables) and is not replayed before the mapper has read
 * them once (Recorder::isReady): the view keeps showing its previous frame
 * until then, one UI frame at most, rather than a frame with unset
 * properties.
 *
 * Pacing: the view's frame scheduler (rnsurface::FrameScheduler) lives here,
 * under the producer's lock, as its record side is called from these three
 * threads and its present side from the thread the view presents on (see
 * pace). It decides when a job starts: a view has at most one in flight, one
 * recording ready on the target, and one that ended before the window took
 * the ready one, which waits here (see onFramesTaken). Updates that arrive
 * meanwhile only mark the content dirty; the next job picks them up. While a
 * job fits in a frame of the display, the next starts once the window took
 * the ready recording; once it does not, as soon as the previous job ends, so
 * that the replay of one frame overlaps the present of the other. The ready
 * recording is known by identity: the view presents recordings that are not
 * this producer's too (a client's, the last frame shown again), and those
 * free no slot.
 */
class RNSkGraphiteProducer
    : public std::enable_shared_from_this<RNSkGraphiteProducer> {
public:
  using Scheduler = rnsurface::FrameScheduler;

  /**
   Takes a thread of the render pool for the life of the producer. `policy`
   is the pacing policy of the platform (see RNSkPacingPolicy.h); what the
   window shows is known once the view has one (see setWindow).
   */
  explicit RNSkGraphiteProducer(Scheduler::Policy policy);
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
   Whether a frame is on its way: one is being recorded, waits for the
   window to take the one before it, or was asked for and starts once there
   is room for it (see requestFrame). The view drops a frame recorded for a
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

  // Pacing -------------------------------------------------------------------

  /**
   Runs an entry of the scheduler's present side, `entry(scheduler)`, under
   the producer's lock, and returns the actions it asks for, which the view
   runs outside of it. Present thread.
   */
  template <typename Entry> Scheduler::Actions pace(Entry &&entry) {
    std::lock_guard<std::mutex> lock(_mutex);
    return std::forward<Entry>(entry)(_scheduler);
  }

  /** What the view's window shows (see Scheduler::Window). Present thread. */
  void setWindow(Scheduler::Window window);

  /** The view left its window (see Scheduler::cancel). Present thread. */
  void cancelFrames();

  /**
   Whether a frame signal is asked for and has not come (see
   Scheduler::wantsFrameSignal). Present thread.
   */
  bool wantsFrameSignal();

  /**
   The view took these recordings off the target, for its window: the ready
   recording among them, if it is, leaves its slot now, before its replay,
   so that the next job overlaps it. Present thread.
   */
  void onFramesTaken(
      const std::vector<std::shared_ptr<RNSkGraphiteRecording>> &recordings);

  /**
   The window could not take these after all (no drawable), and they are
   back on the target: the recording that left the ready slot for them, if
   it is among them, is the ready one again. Present thread.
   */
  void onFramesReturned(
      const std::vector<std::shared_ptr<RNSkGraphiteRecording>> &recordings);

  /**
   Replays the current content into a canvas, on the calling thread (a
   snapshot). The canvas draws in pixels, this applies the density.
   */
  void renderInto(SkCanvas *canvas, float pixelDensity);

private:
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
  /**
   Asks the scheduler for a recording, if there is something to record and
   a target to record it into. Under the lock.
   */
  void requestRecordingLocked();
  /** Does what the scheduler's record side asks for. Under the lock. */
  void applyLocked(const Scheduler::Actions &actions);
  /**
   Queues the ready recording on the target. One the target drops (made for
   a GPU device lost since) is done with on the spot. Under the lock.
   */
  void queueReadyLocked();
  /**
   Lets go of the ready recording when it can never be presented: made for a
   GPU device lost since, which the target dropped, or the view skips. Under
   the lock.
   */
  void forgetUnpresentableLocked();
  void produce();

  // Content and scheduling state.
  std::mutex _mutex;
  std::shared_ptr<RNSkGraphiteTarget> _target;
  std::shared_ptr<Recorder> _recorder;
  sk_sp<SkPicture> _picture;
  bool _dirty = false;
  // When the view's jobs start and its frames go to the window (see the
  // class comment), and the recordings it paces: the one ready on the
  // target, the one that ended before the window took it, and the one the
  // window took last, should it give it back.
  Scheduler _scheduler;
  std::shared_ptr<RNSkGraphiteRecording> _ready;
  std::shared_ptr<RNSkGraphiteRecording> _waiting;
  std::weak_ptr<RNSkGraphiteRecording> _taken;
  // The render thread every job of this producer runs on, so that its
  // frames are always recorded on the same Graphite recorder (see
  // RNSkThreadPool::acquireLane). Set once, read without the lock.
  const size_t _lane;
};

} // namespace RNSkia
