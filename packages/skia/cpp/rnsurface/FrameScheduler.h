#pragma once

#include <algorithm>
#include <cstdint>

namespace rnsurface {

/**
 * Paces the frames of one view through three stages: record (the content is
 * replayed into a recording, on a thread of the view's own), submit (the
 * recording is replayed into a window texture and its work handed to the
 * GPU) and present (the texture goes to the compositor). The last two happen
 * on the thread the view presents on.
 *
 * The names follow their closest web and WebGPU counterparts: a view asks
 * for an animation frame and is called back at the next frame of the display
 * (requestAnimationFrame), a frame's work is submitted to the queue, the work
 * submitted before is done or not (queue.onSubmittedWorkDone), and a window
 * shows its frames first in, first out, or the latest one (the Fifo and
 * Mailbox present modes).
 *
 * It decides on four inputs and nothing else. The animation frame says that
 * a frame of the display started, how long it lasts and until when a frame
 * presented still makes it (onAnimationFrame). The deadline is that last
 * moment. The previous work is the GPU's work on the frame presented before:
 * whether it is done is read by the caller whenever it steps the scheduler
 * (WindowState::previousWorkDone). The stage times are the measured
 * durations of a recording and of a submit (onRecordingFinished,
 * Submitted::duration).
 *
 * Rules:
 *
 * - One present per frame of the display. The time between two deadlines is
 *   one slot of the compositor: a frame presented in a slot that already got
 *   one would wait a frame behind it (a SurfaceView, a CAMetalLayer), so it
 *   stays queued until the next animation frame instead. A frame ready
 *   before the deadline of a slot that got none goes at once. The window
 *   gets one submit per slot, counted from when the submit starts: a submit
 *   can last most of a frame, and a frame submitted on each animation frame
 *   lands in a slot of its own however long its submit is.
 * - No present before the previous work is done, where a present waits for
 *   the GPU to finish the frame before it (Android, see
 *   WaitForPreviousWork). A frame whose predecessor the GPU is still on has
 *   its work submitted and its present deferred: the previous work being
 *   done releases it.
 * - A bounded pipeline. A view owns at most one frame per stage: one being
 *   recorded, one ready, one in the window (its present deferred, or
 *   presented). A recording that finishes while the ready one has not been
 *   taken off the queue waits where it is, and no other starts: nothing is
 *   recorded that will not be shown, and nothing is dropped.
 * - The frames in flight follow the measured time
 *   (FramesInFlight::kAdaptive). While a recording fits in a frame of the
 *   display, the next one starts once the window took the previous frame,
 *   so the view has a single frame in flight between two presents (the
 *   lowest latency). Once it does not fit, a recording starts as soon as
 *   the previous one finishes, a second frame in flight, so that it
 *   overlaps the present of the frame before it and the view keeps the
 *   display's rate. Going to two takes two late recordings out of four;
 *   coming back to one, recordings that fit, kFitsForOneInFlight of them in
 *   a row at least, for kFramesForOneInFlight frames of the display: a
 *   recording that hovers around a frame would otherwise switch every few
 *   frames, and each switch shows (coming back skips a frame).
 * - A missed deadline skips the frame: it goes on the next animation frame,
 *   and nothing else changes.
 *
 * What differs between platforms is policy (see Policy): whether a present
 * waits for the previous work, and whether the window shows each frame in
 * turn or the latest one at each of its draws (a TextureView, which then
 * says when it drew, see onFrameConsumed).
 *
 * The scheduler calls nothing: each entry returns what the caller does next
 * (see Actions), and the caller reports back what came of it. It holds no
 * lock either. The entries of the record side are called from the threads
 * that record and update the content, the others from the present thread:
 * the caller serializes them (one mutex), and runs the actions outside of it.
 */
class FrameScheduler {
public:
  /** Nanoseconds, on the clock of the animation frames. */
  using Nanos = std::int64_t;

  /**
   What the window shows of the frames presented to it, named after the
   present modes of WebGPU whose behavior it has. It is the window's own, and
   not the mode its swapchain is configured with, which is Fifo for every
   window (see RNSkWindowSurface::configureSurface).
   */
  enum class PresentMode {
    // No backing view yet: there is no surface to present on.
    kNone,
    // Each frame in turn: a SurfaceView, a CAMetalLayer.
    kFifo,
    // The latest frame presented, at each of its draws: a TextureView.
    kMailbox,
  };

  /**
   Where a frame waits for the previous work: for the GPU to be done with the
   frame presented before it.
   */
  enum class WaitForPreviousWork {
    // Nowhere, a present does not wait for the GPU: Metal.
    kNever,
    // Before its present: the frame is submitted and its present deferred
    // until the GPU is done with the previous one, so that its work
    // overlaps. Android.
    kBeforePresent,
    // Before its submit: the frame stays queued, its window texture not
    // acquired, until the GPU is done with the previous one. No present is
    // ever deferred, and the GPU idles for as long as a submit takes: what
    // kBeforePresent is measured against.
    kBeforeSubmit,
  };

  /** How many frames the view may own ahead of the window. */
  enum class FramesInFlight {
    // One while a recording fits in a frame of the display, two otherwise.
    kAdaptive,
    // Always two: a recording starts as soon as the previous one finishes.
    kTwo,
  };

  struct Policy {
    PresentMode presentMode = PresentMode::kNone;
    WaitForPreviousWork waitForPreviousWork = WaitForPreviousWork::kNever;
    FramesInFlight framesInFlight = FramesInFlight::kAdaptive;
  };

  /**
   A frame of the display starts: what the callback of a
   requestAnimationFrame() is given, with the deadline the web does not
   expose.
   */
  struct AnimationFrame {
    // When it started.
    Nanos time = 0;
    // How long it lasts.
    Nanos interval = 0;
    // The latest moment a frame can be presented and still be shown in the
    // frame of the display this one announces.
    Nanos deadline = 0;
  };

  /**
   What the window holds, read by the caller right before each entry of the
   present side: the window is the one that knows.
   */
  struct WindowState {
    // The window can show a frame: one is attached, the app is in the
    // foreground and there is a GPU device. While it cannot, the scheduler
    // asks nothing of the present side: whatever makes it able to again
    // steps the scheduler (see onCanPresent).
    bool canPresent = true;
    // Frames wait to be submitted.
    bool queued = false;
    // A frame is submitted and its present is deferred.
    bool presentDeferred = false;
    // The GPU is done with the frame presented last, or none was: what
    // queue.onSubmittedWorkDone() resolves for. Read where the answer
    // decides something: while a present is deferred, and where a frame
    // waits before its submit until the GPU is done.
    bool previousWorkDone = true;
  };

  /** What became of the frame the caller was asked to submit. */
  enum class SubmitResult {
    // It went to the window.
    kPresented,
    // Its work is submitted and its present deferred until the previous
    // work is done, or until the next slot (see Actions::deferPresent).
    kPresentDeferred,
    // The window had no texture for it right now (no drawable, as when
    // getCurrentTexture() fails, or a window that changed under the
    // submit): it is tried again on the next animation frame.
    kNoTexture,
    // Nothing went to the window: the frames taken off the queue were
    // consumed unshown, none was queued, or the window can show none (see
    // WindowState::canPresent).
    kNothing,
  };

  struct Submitted {
    SubmitResult result = SubmitResult::kNothing;
    // How long the submit took, when a frame was submitted.
    Nanos duration = 0;
  };

  /** What the caller does next, outside of its lock. */
  struct Actions {
    // Record side: start a recording, then report onRecordingFinished().
    bool startRecording = false;
    // Record side: the recording that finished (or the one that waited, see
    // onReadyFrameTaken) is the ready frame from now on; queue it.
    bool queueRecording = false;
    // Present side: have onAnimationFrame() called at the next frame of the
    // display.
    bool requestAnimationFrame = false;
    // Present side: submit one queued frame (acquire the window texture,
    // replay the recording into it, hand the work to the GPU) and present
    // it, or defer its present while the GPU is on the frame before it;
    // then report onFrameSubmitted().
    bool submitFrame = false;
    // With submitFrame: defer the present of that frame whatever the GPU is
    // on. The slot it is submitted in has a frame already (one presented
    // late), so its work goes to the GPU now and its present waits for the
    // next slot.
    bool deferPresent = false;
    // Present side: present the frame whose present is deferred, then
    // report onDeferredFramePresented().
    bool presentDeferredFrame = false;
    // Present side: call onSubmittedWorkDonePoll() again shortly: a frame
    // waits for the GPU to be done, which nothing announces, or a deferred
    // present for its slot.
    bool pollSubmittedWorkDone = false;

    bool none() const {
      return !startRecording && !queueRecording && !requestAnimationFrame &&
             !submitFrame && !deferPresent && !presentDeferredFrame &&
             !pollSubmittedWorkDone;
    }
  };

  /** What the scheduler did so far, for the logs and the tests. */
  struct Stats {
    // Animation frames heard.
    std::uint64_t animationFrames = 0;
    // Frames that went to the window, and how many presents were deferred.
    std::uint64_t presents = 0;
    std::uint64_t deferredPresents = 0;
    // Frames submitted on an animation frame, between two of them (ready
    // before the deadline of a slot that had none), and as urgent.
    std::uint64_t submittedOnFrame = 0;
    std::uint64_t submittedInSlot = 0;
    std::uint64_t submittedUrgent = 0;
    // Frames ready in a free slot, too late for its deadline.
    std::uint64_t missedDeadlines = 0;
    // Frames the window had no texture for.
    std::uint64_t noTexture = 0;
    // Recordings finished, those that were late, those that finished before
    // the window took the ready frame, and the times the frames in flight
    // changed.
    std::uint64_t recordings = 0;
    std::uint64_t lateRecordings = 0;
    std::uint64_t waitingRecordings = 0;
    std::uint64_t framesInFlightChanges = 0;
    // Polls for the previous work (see Actions::pollSubmittedWorkDone).
    std::uint64_t polls = 0;
  };

  // A recording is late once it finishes this far into the frame it started
  // in, and fits again once it finishes this early, as shares of the frame.
  static constexpr int kLatePercent = 85;
  static constexpr int kFitsPercent = 65;
  // Recordings that fit, in a row, and the frames of the display they span,
  // for the view to have one frame in flight again: about a second, whatever
  // the display's rate, so that a view disturbed now and then settles on two
  // frames in flight rather than skip a frame after each disturbance.
  static constexpr int kFitsForOneInFlight = 30;
  static constexpr int kFramesForOneInFlight = 90;

  FrameScheduler() = default;
  explicit FrameScheduler(Policy policy) : _policy(policy) {
    _twoInFlight = policy.framesInFlight == FramesInFlight::kTwo;
  }

  FrameScheduler(const FrameScheduler &) = delete;
  FrameScheduler &operator=(const FrameScheduler &) = delete;

  // Policy -------------------------------------------------------------------

  /**
   What the window shows, known once the backing view exists. A window of
   another mode has drawn nothing of this view yet.
   */
  void setPresentMode(PresentMode presentMode) {
    if (_policy.presentMode != presentMode) {
      _frameInWindow = false;
    }
    _policy.presentMode = presentMode;
  }

  const Policy &policy() const { return _policy; }

  // Record side --------------------------------------------------------------

  /**
   The content changed and can be recorded. Requests made while a recording
   is in flight, or while there is no room for another, are one request: the
   recording that starts next has the latest content.
   */
  Actions onRecordingRequested(Nanos now) {
    _recordingRequested = true;
    Actions actions;
    startRecordingIfDue(now, &actions);
    return actions;
  }

  /**
   The recording asked for with Actions::startRecording finished, `duration`
   after it started. With `produced`, it made a frame for the view: the
   ready one from now on (Actions::queueRecording), unless the previous
   ready frame has not been taken yet; it then waits, with the caller, for
   onReadyFrameTaken().
   */
  Actions onRecordingFinished(Nanos now, Nanos duration, bool produced) {
    _recording = false;
    Actions actions;
    if (produced) {
      _active = true;
      _stats.recordings++;
      noteRecordingTime(now, duration);
      if (_ready) {
        _waiting = true;
        _stats.waitingRecordings++;
      } else {
        _ready = true;
        actions.queueRecording = true;
      }
    }
    startRecordingIfDue(now, &actions);
    return actions;
  }

  /**
   The view is done with the ready frame: its window took it off the queue,
   or it will never be shown (made for a GPU device lost since). The
   recording that waited behind it, if any, is the ready frame now.
   */
  Actions onReadyFrameTaken(Nanos now) {
    Actions actions;
    if (!_ready) {
      return actions;
    }
    _ready = false;
    if (_waiting) {
      _waiting = false;
      _ready = true;
      actions.queueRecording = true;
    }
    startRecordingIfDue(now, &actions);
    return actions;
  }

  /**
   The window gave the ready frame back, untouched: it had no texture for it
   after all (no drawable), and the frame waits again.
   */
  void onReadyFrameReturned() { _ready = true; }

  /**
   The view records for another target from now on: what it recorded for
   the previous one is not coming through it any more.
   */
  Actions onRecordingsForgotten(Nanos now) {
    _ready = false;
    _waiting = false;
    Actions actions;
    startRecordingIfDue(now, &actions);
    return actions;
  }

  // Present side -------------------------------------------------------------

  /** The animation frame asked for with Actions::requestAnimationFrame. */
  Actions onAnimationFrame(const AnimationFrame &frame, Nanos now,
                           const WindowState &window) {
    _animationFrameRequested = false;
    _noTexture = false;
    _stats.animationFrames++;
    _deadline = frame.deadline;
    _interval = frame.interval;
    _frameTime = frame.time;
    boundSubmitTimes();
    // A view that did something since the last animation frame asks for one
    // more, so that the slots stay known while its frames keep coming.
    const bool wasActive = _active;
    _active = false;
    return step(now, window, On::kAnimationFrame, wasActive);
  }

  /**
   A frame was queued. With `urgent`, it is for a window resized since the
   frame it shows was made, which shows that frame stretched meanwhile: it
   goes ahead of the deadline or of the draw it would otherwise wait for, but
   not into a slot that already got a frame.
   */
  Actions onFrameQueued(Nanos now, const WindowState &window, bool urgent) {
    return step(now, window, urgent ? On::kUrgentFrame : On::kEvent,
                /* wantsFrame= */ false);
  }

  /**
   The window drew the frame it was given (a window that shows the latest
   frame): the next one can go to it.
   */
  Actions onFrameConsumed(Nanos now, const WindowState &window) {
    _frameInWindow = false;
    return step(now, window, On::kEvent, /* wantsFrame= */ false);
  }

  /** The poll asked for with Actions::pollSubmittedWorkDone. */
  Actions onSubmittedWorkDonePoll(Nanos now, const WindowState &window) {
    _stats.polls++;
    return step(now, window, On::kEvent, /* wantsFrame= */ false);
  }

  /**
   What came of Actions::submitFrame, or of a frame the view submitted on its
   own (a redraw, which the window asks for as it attaches or resizes and no
   slot can make wait).
   */
  Actions onFrameSubmitted(const Submitted &submitted, Nanos now,
                           const WindowState &window) {
    switch (submitted.result) {
    case SubmitResult::kPresented:
      noteSubmitStart(now - submitted.duration);
      notePresent(now);
      noteSubmitTime(submitted.duration);
      break;
    case SubmitResult::kPresentDeferred:
      noteSubmitStart(now - submitted.duration);
      _active = true;
      _stats.deferredPresents++;
      noteSubmitTime(submitted.duration);
      break;
    case SubmitResult::kNoTexture:
      _noTexture = true;
      _stats.noTexture++;
      break;
    case SubmitResult::kNothing:
      break;
    }
    return step(now, window, On::kEvent, /* wantsFrame= */ false);
  }

  /**
   The frame whose present was deferred went to the window
   (Actions::presentDeferredFrame).
   */
  Actions onDeferredFramePresented(Nanos now, const WindowState &window) {
    notePresent(now);
    return step(now, window, On::kEvent, /* wantsFrame= */ false);
  }

  /**
   The frame whose present was deferred went nowhere: the window lost it
   before Actions::presentDeferredFrame (taken back by the platform, or its
   GPU device lost).
   */
  Actions onDeferredFrameLost(Nanos now, const WindowState &window) {
    return step(now, window, On::kEvent, /* wantsFrame= */ false);
  }

  /**
   The window can show frames again: one attached, the app came back to the
   foreground, the GPU device was replaced.
   */
  Actions onCanPresent(Nanos now, const WindowState &window) {
    return step(now, window, On::kEvent, /* wantsFrame= */ false);
  }

  /**
   The view left its window, or the window lost its surface: the scheduler
   forgets what it asked of the present side and what the window showed,
   which is more than a cancelAnimationFrame(). The caller cancels its
   animation frame, or, where one has no cancel, does not call
   onAnimationFrame() for one that is no longer asked for (see
   hasPendingAnimationFrame). The frames recorded stay.
   */
  void cancel() {
    _animationFrameRequested = false;
    _frameInWindow = false;
    _noTexture = false;
    _active = false;
  }

  /**
   Whether an animation frame is asked for and has not come: a caller that
   ticks on its own (a display link) pauses when none is.
   */
  bool hasPendingAnimationFrame() const { return _animationFrameRequested; }

  // Introspection, for the tests and the logs --------------------------------

  /**
   How many frames the view owns ahead of the window right now: two when a
   recording starts as soon as the previous one finishes, else one.
   */
  int framesInFlight() const { return _twoInFlight ? 2 : 1; }
  bool isRecording() const { return _recording; }
  bool hasReadyFrame() const { return _ready; }
  bool hasWaitingRecording() const { return _waiting; }
  Nanos submitEstimate() const { return _submitEstimate; }
  Nanos interval() const { return _interval; }
  /** How long after the latest animation frame started its deadline is. */
  Nanos deadlineAfterFrameStart() const { return _deadline - _frameTime; }
  const Stats &stats() const { return _stats; }

private:
  /** What a step comes from. */
  enum class On {
    // An animation frame: the frame it finds goes whatever its submit
    // takes, so that a frame is never late for every animation frame.
    kAnimationFrame,
    // A frame for a resized window (see onFrameQueued).
    kUrgentFrame,
    // Anything else.
    kEvent,
  };

  /** Why a queued frame goes, or what it waits for. */
  enum class Verdict {
    kSubmit,
    kSubmitAndDeferPresent,
    kWaitsForPreviousWork,
    kWaitsForAnimationFrame,
    kWaitsForWindowDraw,
  };

  /** A slot of the compositor: the time between two deadlines. */
  struct Slot {
    // Whether an animation frame announced it: the others are extrapolated.
    bool known;
    Nanos start;
    Nanos end;
  };

  /**
   The slot `now` is in. The slots end a frame of the display apart, at the
   deadline of the latest animation frame and before and after it: a
   deadline can be more than a frame past the start of its frame (Android's
   frame timeline), so that the slot a frame lands in when it is submitted
   right as an animation frame starts is one, two or more slots before the
   one that animation frame announces.
   */
  Slot slotAt(Nanos now) const {
    if (_interval <= 0) {
      return {false, 0, 0};
    }
    // A slot includes its deadline, not the one before it.
    if (now <= _deadline) {
      const Nanos end = _deadline - ((_deadline - now) / _interval) * _interval;
      return {true, end - _interval, end};
    }
    const Nanos slots = (now - _deadline - 1) / _interval;
    return {false, _deadline + slots * _interval,
            _deadline + (slots + 1) * _interval};
  }

  /**
   Whether a frame went to the window in the slot `now` is in, where the
   window shows each frame in turn.
   */
  bool slotHasPresent(Nanos now) const {
    return _policy.presentMode == PresentMode::kFifo && _presented &&
           _interval > 0 && _lastPresent > slotAt(now).start;
  }

  Verdict verdict(Nanos now, const WindowState &window, On on) {
    if (_policy.waitForPreviousWork == WaitForPreviousWork::kBeforeSubmit &&
        !window.previousWorkDone) {
      return Verdict::kWaitsForPreviousWork;
    }
    if (_noTexture) {
      return Verdict::kWaitsForAnimationFrame;
    }
    if (_policy.presentMode == PresentMode::kMailbox) {
      // The window's draw is its slot: one frame between two draws.
      return on == On::kUrgentFrame || !_frameInWindow
                 ? Verdict::kSubmit
                 : Verdict::kWaitsForWindowDraw;
    }
    const Slot slot = slotAt(now);
    if (_submitted && _interval > 0 && _lastSubmitStart > slot.start) {
      // The window got its submit for this slot.
      return Verdict::kWaitsForAnimationFrame;
    }
    // Whether the frame makes this slot's deadline, submitted now. Where a
    // present waits for the previous work, a frame submitted while the GPU
    // is on the one before has its present deferred, and released into this
    // slot or a later one: whether the GPU is done is not asked here, as
    // each answer costs a call into Dawn.
    const bool landsInSlot = now + _submitEstimate < slot.end;
    const bool slotHasPresent = this->slotHasPresent(now);
    if (on != On::kEvent) {
      // A frame goes on each animation frame, whatever its submit takes, so
      // that the GPU is never left waiting for one, and a frame for a
      // resized window goes ahead of the animation frame. When a frame
      // presented late (deferred for the GPU, or after a long submit) is in
      // this slot already, this one must not join it there: where a present
      // can be deferred, it is, until the next slot; elsewhere the frame
      // waits for the next animation frame, unless its submit takes it into
      // the next slot anyway.
      Verdict verdict = Verdict::kSubmit;
      if (slotHasPresent) {
        if (_policy.waitForPreviousWork ==
            WaitForPreviousWork::kBeforePresent) {
          verdict = Verdict::kSubmitAndDeferPresent;
        } else if (landsInSlot) {
          return Verdict::kWaitsForAnimationFrame;
        }
      }
      if (on == On::kUrgentFrame) {
        _stats.submittedUrgent++;
      } else {
        _stats.submittedOnFrame++;
      }
      return verdict;
    }
    if (!slot.known || slotHasPresent || !landsInSlot) {
      // Between two animation frames a frame only goes into a slot known to
      // be open, and when it makes that slot's deadline.
      if (slot.known && !slotHasPresent && !_missedDeadline) {
        _missedDeadline = true;
        _stats.missedDeadlines++;
      }
      return Verdict::kWaitsForAnimationFrame;
    }
    _stats.submittedInSlot++;
    return Verdict::kSubmit;
  }

  Actions step(Nanos now, const WindowState &window, On on, bool wantsFrame) {
    Actions actions;
    if (_policy.presentMode == PresentMode::kNone || !window.canPresent) {
      return actions;
    }
    if (window.presentDeferred) {
      // The deferred present goes first, and alone: the window takes no
      // other frame meanwhile. It goes once the GPU is done with the frame
      // before it, into a slot of its own: released into the slot that
      // frame went to, it would wait a frame behind it in the compositor.
      if (window.previousWorkDone && !slotHasPresent(now)) {
        actions.presentDeferredFrame = true;
        return actions;
      }
      actions.pollSubmittedWorkDone = true;
    } else if (window.queued) {
      switch (verdict(now, window, on)) {
      case Verdict::kSubmit:
        actions.submitFrame = true;
        return actions;
      case Verdict::kSubmitAndDeferPresent:
        actions.submitFrame = true;
        actions.deferPresent = true;
        return actions;
      case Verdict::kWaitsForPreviousWork:
        actions.pollSubmittedWorkDone = true;
        break;
      case Verdict::kWaitsForAnimationFrame:
        wantsFrame = true;
        break;
      case Verdict::kWaitsForWindowDraw:
        break;
      }
    }
    if ((wantsFrame || _active) && !_animationFrameRequested) {
      _animationFrameRequested = true;
      actions.requestAnimationFrame = true;
    }
    return actions;
  }

  void noteSubmitStart(Nanos start) {
    _submitted = true;
    _lastSubmitStart = start;
  }

  void notePresent(Nanos now) {
    _presented = true;
    _lastPresent = now;
    _active = true;
    _missedDeadline = false;
    _stats.presents++;
    if (_policy.presentMode == PresentMode::kMailbox) {
      _frameInWindow = true;
    }
  }

  /**
   Estimates what the next submit takes from the last ones: the median of
   the last three, averaged over the recent ones (a quarter of each new
   median). One long submit, a first frame that compiles its pipelines, says
   nothing of the next, and is never the median. Averaged in as it is, it
   would pass the next frame for one whose submit takes it out of a slot
   that has a frame already (see verdict), and that slot would get two;
   and frames ready for a free slot would wait for an animation frame until
   it was averaged out. Until two submits are measured there is no estimate:
   a frame is taken to land in the slot it starts in. No submit counts for
   more than a frame of the display either: that long, it already lands in
   no slot it starts in.
   */
  void noteSubmitTime(Nanos duration) {
    if (duration <= 0) {
      return;
    }
    if (_interval > 0) {
      duration = std::min(duration, _interval);
    }
    _submits[2] = _submits[1];
    _submits[1] = _submits[0];
    _submits[0] = duration;
    const Nanos median =
        std::max(std::min(_submits[0], _submits[1]),
                 std::min(std::max(_submits[0], _submits[1]), _submits[2]));
    if (median == 0) {
      return;
    }
    // A recent estimate: a quarter of each new median.
    _submitEstimate = _submitEstimate == 0
                          ? median
                          : _submitEstimate + (median - _submitEstimate) / 4;
  }

  /**
   Brings the submits measured before the frame of the display was known,
   or on a display that was slower then, down to that frame (see
   noteSubmitTime).
   */
  void boundSubmitTimes() {
    if (_interval <= 0) {
      return;
    }
    _submitEstimate = std::min(_submitEstimate, _interval);
    for (Nanos &submit : _submits) {
      submit = std::min(submit, _interval);
    }
  }

  void startRecordingIfDue(Nanos now, Actions *actions) {
    // One recording at a time, and none while one waits for the ready slot.
    // With one frame in flight, the view starts the next once the window
    // took the ready one.
    if (!_recordingRequested || _recording || _waiting ||
        (!_twoInFlight && _ready)) {
      return;
    }
    _recordingRequested = false;
    _recording = true;
    _active = true;
    // The frame the recording starts in, when it is the latest animation
    // frame.
    _recordingFrameTime =
        _interval > 0 && now >= _frameTime && now - _frameTime < _interval
            ? _frameTime
            : 0;
    actions->startRecording = true;
  }

  /**
   Measures a recording against the frame of the display: how far into the
   frame it started in it finished, or, when that frame is not known, how
   long it took.
   */
  void noteRecordingTime(Nanos now, Nanos duration) {
    if (_policy.framesInFlight != FramesInFlight::kAdaptive || _interval <= 0) {
      return;
    }
    Nanos spent = duration;
    if (_recordingFrameTime != 0 && now - _recordingFrameTime > spent) {
      spent = now - _recordingFrameTime;
    }
    const bool late = spent * 100 > _interval * kLatePercent;
    const bool fits = spent * 100 < _interval * kFitsPercent;
    if (late) {
      _stats.lateRecordings++;
    }
    if (_twoInFlight) {
      if (!fits) {
        _fits = 0;
        return;
      }
      if (_fits++ == 0) {
        _fitsSince = now;
      }
      if (_fits >= kFitsForOneInFlight &&
          now - _fitsSince >= _interval * kFramesForOneInFlight) {
        _twoInFlight = false;
        _fits = 0;
        _lateHistory = 0;
        _stats.framesInFlightChanges++;
      }
      return;
    }
    // The last four recordings, the latest in the lowest bit.
    _lateHistory = ((_lateHistory << 1) | (late ? 1u : 0u)) & 0xFu;
    int lates = 0;
    for (unsigned bits = _lateHistory; bits != 0; bits >>= 1) {
      lates += static_cast<int>(bits & 1u);
    }
    if (lates >= 2) {
      _twoInFlight = true;
      _fits = 0;
      _stats.framesInFlightChanges++;
    }
  }

  Policy _policy;

  // Record side: a recording was asked for and has not started; one is in
  // flight; the view's ready frame is queued; a recording that finished
  // waits for the ready slot.
  bool _recordingRequested = false;
  bool _recording = false;
  bool _ready = false;
  bool _waiting = false;
  // Frames in flight: whether a recording starts as soon as the previous one
  // finishes, and what the recent recordings say about it.
  bool _twoInFlight = false;
  int _fits = 0;
  Nanos _fitsSince = 0;
  unsigned _lateHistory = 0;
  Nanos _recordingFrameTime = 0;

  // Present side: the latest animation frame.
  Nanos _frameTime = 0;
  Nanos _interval = 0;
  Nanos _deadline = 0;
  bool _animationFrameRequested = false;
  // When the last submit to the window started, and when a frame last went
  // to it: the same moment but for the submit, unless the present was
  // deferred.
  bool _submitted = false;
  Nanos _lastSubmitStart = 0;
  bool _presented = false;
  Nanos _lastPresent = 0;
  // A window that shows the latest frame has one it has not drawn yet.
  bool _frameInWindow = false;
  // The window had no texture for a frame: nothing is tried before the next
  // animation frame.
  bool _noTexture = false;
  // The view recorded, submitted or presented since the last animation
  // frame.
  bool _active = false;
  // What a submit takes, and the last three measured, the latest first (see
  // noteSubmitTime).
  Nanos _submitEstimate = 0;
  Nanos _submits[3] = {0, 0, 0};
  // The frame that waits was counted as late for a deadline already.
  bool _missedDeadline = false;
  Stats _stats;
};

} // namespace rnsurface
