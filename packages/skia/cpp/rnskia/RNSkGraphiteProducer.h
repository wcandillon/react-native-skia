#pragma once

#include <memory>
#include <mutex>

#include <jsi/jsi.h>

#include "include/core/SkRefCnt.h"

class SkCanvas;
class SkPicture;

namespace RNSkia {

namespace jsi = facebook::jsi;

class Recorder;
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
 * target and submits the recording; the main thread presents it on the next
 * vsync.
 *
 * Pacing: a view has at most one job in flight and at most one recording
 * waiting to be presented. Updates that arrive meanwhile only mark the content
 * dirty; the next presented frame starts the next job. A producer that
 * outruns the display therefore records once per vsync, and the queue of the
 * target never grows.
 */
class RNSkGraphiteProducer
    : public std::enable_shared_from_this<RNSkGraphiteProducer> {
public:
  RNSkGraphiteProducer() = default;
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

  /** The view presented a frame: the next one may start. */
  void onFramePresented();

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
   it: the recorder's destructor hands the commands to the main thread, and a
   pool thread still replaying it keeps it alive until it is done. Pending
   writes go away with their recorder.
   */
  void replaceContent(std::shared_ptr<Recorder> recorder,
                      sk_sp<SkPicture> picture, bool dirty);
  void kickLocked();
  void produce();

  // Content and scheduling state.
  std::mutex _mutex;
  std::shared_ptr<RNSkGraphiteTarget> _target;
  std::shared_ptr<Recorder> _recorder;
  sk_sp<SkPicture> _picture;
  bool _dirty = false;
  bool _inFlight = false;
  bool _presentPending = false;
};

} // namespace RNSkia
