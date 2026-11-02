#pragma once

#include "RNSkPresentHold.h"

namespace RNSkia {

/**
 What a view's present did, as a mask its platform view reads (see
 RNSkView::presentFrame). Android's FrameScheduler spells the same bits.
 */
enum PresentFrameResult : int {
  kNothingPresented = 0,
  // A frame went to the window.
  kFramePresented = 1,
  // A frame is left for a later frame: more were queued, the window holds
  // one, or it could not take one (no drawable).
  kMoreQueued = 2,
  // A replay is in flight: the platform view asks again on every frame,
  // each a tick that paces the replays (see RNSkReplaySchedule).
  kReplayComing = 4,
  // The window holds a frame until the GPU finishes the frame before it,
  // which no event announces: the platform view presents it a moment later
  // rather than at its next frame (see RNSkView::presentHeldFrame).
  kHeldForGpu = 8,
};

/** What a view found once it presented, the facts its result reads. */
struct PresentOutcome {
  // A frame went to the window.
  bool framePresented;
  // The window can show a frame: attached, the app in the foreground, the
  // GPU device not lost.
  bool windowCanPresent;
  // Recordings are queued on the view's target.
  bool recordingsQueued;
  // What the frame the window held waits for, the hold's own answer (see
  // RNSkPresentHold::presentHeldFrame).
  HeldFrame heldFrame;
  // A replay is in flight.
  bool replaying;
};

/** Whether the window still holds a frame, by what the hold answered. */
constexpr bool holdsFrame(HeldFrame heldFrame) {
  switch (heldFrame) {
  case HeldFrame::kNone:
  case HeldFrame::kPresented:
    return false;
  case HeldFrame::kWaitingForGpu:
    return true;
  }
  return false;
}

/**
 The result a view's present hands its platform view. A frame left over,
 queued or held, asks for another frame while the window can show one, and
 one held for the GPU alone for a present a moment later; one the window
 cannot show yet waits for the window to come back, which hands the frames
 over again (see RNSkView::onCanPresent). A replay coming asks for every
 frame, so that the frames it takes are counted.
 */
constexpr int presentFrameResult(const PresentOutcome &outcome) {
  int result = outcome.framePresented ? kFramePresented : kNothingPresented;
  if (outcome.windowCanPresent &&
      (outcome.recordingsQueued || holdsFrame(outcome.heldFrame))) {
    result |= kMoreQueued;
  }
  if (outcome.windowCanPresent &&
      outcome.heldFrame == HeldFrame::kWaitingForGpu) {
    result |= kHeldForGpu;
  }
  if (outcome.replaying) {
    result |= kReplayComing;
  }
  return result;
}

/**
 Whether the platform view asks for another frame after a present: one is
 left, or a replay is coming. Otherwise the view asks for no more frames
 until a recording is submitted.
 */
constexpr bool asksForAnotherFrame(int result) {
  return (result & (kMoreQueued | kReplayComing)) != 0;
}

} // namespace RNSkia
