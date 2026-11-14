#pragma once

#include <cstdint>

namespace rnsurface {

/**
 * Paces the frames of one view through three stages: record (the content is
 * replayed into a recording, on a thread of the view's own), submit (the
 * recording is replayed into a window image and its work handed to the GPU)
 * and present (the image goes to the compositor). The last two happen on the
 * thread the view presents on.
 *
 * It decides on four inputs and nothing else. The frame signal says that a
 * frame of the display started, how long it lasts and until when a frame
 * presented still makes it (onFrameSignal). The deadline is that last
 * moment. The acknowledgement says that the GPU is done with the frame
 * presented before (WindowState::acknowledged, read by the caller whenever
 * it steps the scheduler). The stage times are the measured durations of a
 * recording and of a submit (onRecordingEnded, Taken::duration).
 *
 * Rules:
 *
 * - One present per frame of the display. The time between two deadlines is
 *   one slot of the compositor: a frame presented in a slot that already got
 *   one would wait a frame behind it (a SurfaceView, a CAMetalLayer), so it
 *   stays queued until the next frame signal instead. A frame ready before
 *   the deadline of a slot that got none goes at once. The window takes one
 *   frame per slot, counted from when it takes it: a submit can last most of
 *   a frame, and a frame taken on each signal lands in a slot of its own
 *   however long its submit is.
 * - No present without an acknowledgement, where a present waits for the GPU
 *   to finish the frame before it (Android, see Acknowledgement). A frame
 *   whose predecessor is not acknowledged has its work submitted and its
 *   present held: the acknowledgement releases it.
 * - A bounded pipeline. A view owns at most one frame per stage: one being
 *   recorded, one ready, one in the window (held, or presented). A recording
 *   that ends while the ready one has not been taken waits where it is, and
 *   no other starts: nothing is recorded that will not be shown, and nothing
 *   is dropped.
 * - Depth follows the measured time (Depth::kAdaptive). While a recording
 *   fits in a frame of the display, the next one starts once the window took
 *   the previous frame, so the view holds a single frame between two
 *   presents (the lowest latency). Once it does not fit, a recording starts
 *   as soon as the previous one ends, a frame deeper, so that it overlaps
 *   the present of the frame before it and the view keeps the display's
 *   rate. Going deeper takes two late recordings out of four; coming back,
 *   recordings that fit, kFitsToGoShallow of them in a row at least, for
 *   kFramesToGoShallow frames of the display: a recording that hovers
 *   around a frame would otherwise switch every few frames, and each switch
 *   shows (coming back skips a frame).
 * - A missed deadline skips the frame: it goes on the next frame signal, and
 *   nothing else changes.
 *
 * What differs between platforms is policy (see Policy): whether a present
 * waits for an acknowledgement, and whether the window shows each frame in
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
  /** Nanoseconds, on the clock of the frame signals. */
  using Nanos = std::int64_t;

  /** What the window shows of the frames presented to it. */
  enum class Window {
    // No backing view yet: there is no surface to present on.
    kNone,
    // Each frame in turn: a SurfaceView, a CAMetalLayer.
    kShowsEachFrame,
    // The latest frame presented, at each of its draws: a TextureView.
    kShowsLatestFrame,
  };

  /** What a present does while the GPU is on the frame presented before. */
  enum class Acknowledgement {
    // A present does not wait for the GPU: Metal.
    kNone,
    // The frame is submitted and its present held until the GPU is done
    // with the previous one, so that its work overlaps: Android.
    kHoldsPresent,
    // The frame stays queued, its window image not acquired, until the GPU
    // is done with the previous one. Nothing is ever held, and the GPU idles
    // for as long as a submit takes: what kHoldsPresent is measured against.
    kDeclinesFrame,
  };

  /** How many frames the view may own ahead of the window. */
  enum class Depth {
    // One while a recording fits in a frame of the display, two otherwise.
    kAdaptive,
    // Always two: a recording starts as soon as the previous one ends.
    kTwo,
  };

  struct Policy {
    Window window = Window::kNone;
    Acknowledgement acknowledgement = Acknowledgement::kNone;
    Depth depth = Depth::kAdaptive;
  };

  /** A frame of the display starts. */
  struct FrameSignal {
    // When it started.
    Nanos time = 0;
    // How long it lasts.
    Nanos interval = 0;
    // The latest moment a frame can be presented and still be shown in the
    // frame of the display this signal announces.
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
    // steps the scheduler (see onWindowAvailable).
    bool available = true;
    // Frames wait to be taken.
    bool queued = false;
    // A frame is submitted and its present is held.
    bool held = false;
    // The GPU is done with the frame presented last, or none was. Read
    // where the answer decides something: while a frame is held, and where
    // a frame is declined until the GPU is done.
    bool acknowledged = true;
  };

  /** What became of the frame the caller was asked to take. */
  enum class Take {
    // It went to the window.
    kPresented,
    // Its work is submitted and its present held for the acknowledgement.
    kHeld,
    // The window could not take it right now (no drawable): it is tried
    // again on the next frame signal.
    kDeclined,
    // Nothing went to the window: the frames taken were consumed unshown,
    // none was queued, or the window can show none (see
    // WindowState::available).
    kNothing,
  };

  struct Taken {
    Take take = Take::kNothing;
    // How long the submit took, when a frame was submitted.
    Nanos duration = 0;
  };

  /** What the caller does next, outside of its lock. */
  struct Actions {
    // Record side: start a recording, then report onRecordingEnded().
    bool startRecording = false;
    // Record side: the recording that ended (or the one that waited, see
    // onReadyFrameTaken) is the ready frame from now on; queue it.
    bool queueRecording = false;
    // Present side: have onFrameSignal() called on the next frame signal.
    bool requestFrameSignal = false;
    // Present side: submit one queued frame and present it, or hold its
    // present while the GPU is on the frame before it; then report
    // onFrameTaken().
    bool takeFrame = false;
    // With takeFrame: hold the present of that frame whatever the GPU is on.
    // The slot it is taken in has a frame already (one presented late), so
    // its work goes to the GPU now and its present waits for the next slot.
    bool holdPresent = false;
    // Present side: present the held frame, then report
    // onHeldFramePresented().
    bool presentHeldFrame = false;
    // Present side: call onAcknowledgementPoll() again shortly: a frame waits
    // for the GPU to be done, which nothing announces, or a held frame for
    // its slot.
    bool watchAcknowledgement = false;

    bool none() const {
      return !startRecording && !queueRecording && !requestFrameSignal &&
             !takeFrame && !holdPresent && !presentHeldFrame &&
             !watchAcknowledgement;
    }
  };

  /** What the scheduler did so far, for the logs and the tests. */
  struct Stats {
    // Frame signals heard.
    std::uint64_t frameSignals = 0;
    // Frames that went to the window, and how many of them were held first.
    std::uint64_t presents = 0;
    std::uint64_t holds = 0;
    // Frames taken on a frame signal, between two signals (ready before the
    // deadline of a slot that had none), and as urgent.
    std::uint64_t takenOnSignal = 0;
    std::uint64_t takenInSlot = 0;
    std::uint64_t takenUrgent = 0;
    // Frames ready in a free slot, too late for its deadline.
    std::uint64_t missedDeadlines = 0;
    // Frames the window declined (no drawable).
    std::uint64_t declined = 0;
    // Recordings ended, those that were late, those that ended before the
    // window took the ready frame, and the times the depth changed.
    std::uint64_t recordings = 0;
    std::uint64_t lateRecordings = 0;
    std::uint64_t waitingRecordings = 0;
    std::uint64_t depthChanges = 0;
  };

  // A recording is late once it ends this far into the frame it started in,
  // and fits again once it ends this early, as shares of the frame.
  static constexpr int kLatePercent = 85;
  static constexpr int kFitsPercent = 65;
  // Recordings that fit, in a row, and the frames of the display they span,
  // for the view to hold one frame again: about a second, whatever the
  // display's rate, so that a view disturbed now and then settles two frames
  // deep rather than skip a frame after each disturbance.
  static constexpr int kFitsToGoShallow = 30;
  static constexpr int kFramesToGoShallow = 90;

  FrameScheduler() = default;
  explicit FrameScheduler(Policy policy) : _policy(policy) {
    _deep = policy.depth == Depth::kTwo;
  }

  FrameScheduler(const FrameScheduler &) = delete;
  FrameScheduler &operator=(const FrameScheduler &) = delete;

  // Policy -------------------------------------------------------------------

  /**
   What the window shows, known once the backing view exists. A window of
   another kind has drawn nothing of this view yet.
   */
  void setWindow(Window window) {
    if (_policy.window != window) {
      _frameInWindow = false;
    }
    _policy.window = window;
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
   The recording asked for with Actions::startRecording ended, `duration`
   after it started. With `produced`, it made a frame for the view: the
   ready one from now on (Actions::queueRecording), unless the previous
   ready frame has not been taken yet; it then waits, with the caller, for
   onReadyFrameTaken().
   */
  Actions onRecordingEnded(Nanos now, Nanos duration, bool produced) {
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
   The view is done with the ready frame: its window took it, or it will
   never be shown (made for a GPU device lost since). The recording that
   waited behind it, if any, is the ready frame now.
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
   The window gave the ready frame back, untouched: it could not take it
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

  /** The frame signal asked for with Actions::requestFrameSignal. */
  Actions onFrameSignal(const FrameSignal &signal, Nanos now,
                        const WindowState &window) {
    _signalRequested = false;
    _declined = false;
    _stats.frameSignals++;
    _deadline = signal.deadline;
    _interval = signal.interval;
    _signalTime = signal.time;
    // A view that did something since the last signal asks for one more, so
    // that the slots stay known while its frames keep coming.
    const bool wasActive = _active;
    _active = false;
    return step(now, window, On::kFrameSignal, wasActive);
  }

  /**
   A frame was queued. With `urgent`, it is for a window resized since the
   frame it shows was made, which shows that frame stretched meanwhile: it
   goes ahead of the deadline or of the draw it would otherwise wait for, but
   not into a slot that already got a frame.
   */
  Actions onFrameQueued(Nanos now, const WindowState &window, bool urgent) {
    return step(now, window, urgent ? On::kUrgentFrame : On::kEvent,
                /* wantsSignal= */ false);
  }

  /**
   The window drew the frame it was given (a window that shows the latest
   frame): the next one can go to it.
   */
  Actions onFrameConsumed(Nanos now, const WindowState &window) {
    _frameInWindow = false;
    return step(now, window, On::kEvent, /* wantsSignal= */ false);
  }

  /** The poll asked for with Actions::watchAcknowledgement. */
  Actions onAcknowledgementPoll(Nanos now, const WindowState &window) {
    return step(now, window, On::kEvent, /* wantsSignal= */ false);
  }

  /**
   What came of Actions::takeFrame, or of a frame the view took on its own
   (a redraw, which the window asks for as it attaches or resizes and no
   slot can make wait).
   */
  Actions onFrameTaken(const Taken &taken, Nanos now,
                       const WindowState &window) {
    switch (taken.take) {
    case Take::kPresented:
      noteTake(now - taken.duration);
      notePresent(now);
      noteSubmitTime(taken.duration);
      break;
    case Take::kHeld:
      noteTake(now - taken.duration);
      _active = true;
      _stats.holds++;
      noteSubmitTime(taken.duration);
      break;
    case Take::kDeclined:
      _declined = true;
      _stats.declined++;
      break;
    case Take::kNothing:
      break;
    }
    return step(now, window, On::kEvent, /* wantsSignal= */ false);
  }

  /** The held frame went to the window (Actions::presentHeldFrame). */
  Actions onHeldFramePresented(Nanos now, const WindowState &window) {
    notePresent(now);
    return step(now, window, On::kEvent, /* wantsSignal= */ false);
  }

  /**
   The window can show frames again: one attached, the app came back to the
   foreground, the GPU device was replaced.
   */
  Actions onWindowAvailable(Nanos now, const WindowState &window) {
    return step(now, window, On::kEvent, /* wantsSignal= */ false);
  }

  /**
   The view left its window, or the window lost its surface: the scheduler
   forgets what it asked of the present side and what the window showed. The
   caller cancels its frame signal, or, where a signal has no cancel, does
   not call onFrameSignal() for one that is no longer asked for (see
   wantsFrameSignal). The frames recorded stay.
   */
  void cancel() {
    _signalRequested = false;
    _frameInWindow = false;
    _declined = false;
    _active = false;
  }

  /**
   Whether a frame signal is asked for and has not come: a caller that ticks
   on its own (a display link) pauses when none is.
   */
  bool wantsFrameSignal() const { return _signalRequested; }

  // Introspection, for the tests and the logs --------------------------------

  /** Whether a recording starts as soon as the previous one ends. */
  bool isDeep() const { return _deep; }
  bool isRecording() const { return _recording; }
  bool hasReadyFrame() const { return _ready; }
  bool hasWaitingRecording() const { return _waiting; }
  Nanos submitEstimate() const { return _submitEstimate; }
  Nanos interval() const { return _interval; }
  /** How long after the latest frame signal its deadline is. */
  Nanos deadlineAfterSignal() const { return _deadline - _signalTime; }
  const Stats &stats() const { return _stats; }

private:
  /** What a step comes from. */
  enum class On {
    // A frame signal: the frame it finds goes whatever its submit takes, so
    // that a frame is never late for every signal.
    kFrameSignal,
    // A frame for a resized window (see onFrameQueued).
    kUrgentFrame,
    // Anything else.
    kEvent,
  };

  /** Why a queued frame goes, or what it waits for. */
  enum class Verdict {
    kTake,
    kTakeAndHold,
    kWaitsForAcknowledgement,
    kWaitsForFrameSignal,
    kWaitsForWindowDraw,
  };

  /** A slot of the compositor: the time between two deadlines. */
  struct Slot {
    // Whether a frame signal announced it: the others are extrapolated.
    bool known;
    Nanos start;
    Nanos end;
  };

  /**
   The slot `now` is in. The slots end a frame of the display apart, at the
   deadline of the latest signal and before and after it: a deadline can be
   more than a frame past its signal (Android's frame timeline), so that the
   slot a frame lands in when it is taken right at a signal is one, two or
   more slots before the one that signal announces.
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
    return _policy.window == Window::kShowsEachFrame && _presented &&
           _interval > 0 && _lastPresent > slotAt(now).start;
  }

  Verdict verdict(Nanos now, const WindowState &window, On on) {
    if (_policy.acknowledgement == Acknowledgement::kDeclinesFrame &&
        !window.acknowledged) {
      return Verdict::kWaitsForAcknowledgement;
    }
    if (_declined) {
      return Verdict::kWaitsForFrameSignal;
    }
    if (_policy.window == Window::kShowsLatestFrame) {
      // The window's draw is its slot: one frame between two draws.
      return on == On::kUrgentFrame || !_frameInWindow
                 ? Verdict::kTake
                 : Verdict::kWaitsForWindowDraw;
    }
    const Slot slot = slotAt(now);
    if (_taken && _interval > 0 && _lastTake > slot.start) {
      // The window took its frame for this slot.
      return Verdict::kWaitsForFrameSignal;
    }
    // Whether the frame makes this slot's deadline, taken now. Where a
    // present waits for the GPU, a frame taken while the GPU is on the one
    // before is held, and released into this slot or a later one: whether
    // the GPU is done is not asked here, as each answer costs a call into
    // Dawn.
    const bool landsInSlot = now + _submitEstimate < slot.end;
    const bool slotHasPresent = this->slotHasPresent(now);
    if (on == On::kUrgentFrame) {
      _stats.takenUrgent++;
      return Verdict::kTake;
    }
    if (on == On::kFrameSignal) {
      // A frame goes on each frame signal, whatever its submit takes, so
      // that the GPU is never left waiting for one. When a frame presented
      // late (held for the GPU, or after a long submit) is in this slot
      // already, this one must not join it there: where a present can be
      // held, it is, until the next slot; elsewhere the frame waits for the
      // next signal, unless its submit takes it into the next slot anyway.
      if (slotHasPresent) {
        if (_policy.acknowledgement == Acknowledgement::kHoldsPresent) {
          _stats.takenOnSignal++;
          return Verdict::kTakeAndHold;
        }
        if (landsInSlot) {
          return Verdict::kWaitsForFrameSignal;
        }
      }
      _stats.takenOnSignal++;
      return Verdict::kTake;
    }
    if (!slot.known || slotHasPresent || !landsInSlot) {
      // Between two signals a frame only goes into a slot known to be open,
      // and when it makes that slot's deadline.
      if (slot.known && !slotHasPresent && !_missedDeadline) {
        _missedDeadline = true;
        _stats.missedDeadlines++;
      }
      return Verdict::kWaitsForFrameSignal;
    }
    _stats.takenInSlot++;
    return Verdict::kTake;
  }

  Actions step(Nanos now, const WindowState &window, On on, bool wantsSignal) {
    Actions actions;
    if (_policy.window == Window::kNone || !window.available) {
      return actions;
    }
    if (window.held) {
      // The held frame goes first, and alone: the window takes no other
      // meanwhile. It goes once the GPU is done with the frame before it,
      // into a slot of its own: released into the slot that frame went to,
      // it would wait a frame behind it in the compositor.
      if (window.acknowledged && !slotHasPresent(now)) {
        actions.presentHeldFrame = true;
        return actions;
      }
      actions.watchAcknowledgement = true;
    } else if (window.queued) {
      switch (verdict(now, window, on)) {
      case Verdict::kTake:
        actions.takeFrame = true;
        return actions;
      case Verdict::kTakeAndHold:
        actions.takeFrame = true;
        actions.holdPresent = true;
        return actions;
      case Verdict::kWaitsForAcknowledgement:
        actions.watchAcknowledgement = true;
        break;
      case Verdict::kWaitsForFrameSignal:
        wantsSignal = true;
        break;
      case Verdict::kWaitsForWindowDraw:
        break;
      }
    }
    if ((wantsSignal || _active) && !_signalRequested) {
      _signalRequested = true;
      actions.requestFrameSignal = true;
    }
    return actions;
  }

  void noteTake(Nanos start) {
    _taken = true;
    _lastTake = start;
  }

  void notePresent(Nanos now) {
    _presented = true;
    _lastPresent = now;
    _active = true;
    _missedDeadline = false;
    _stats.presents++;
    if (_policy.window == Window::kShowsLatestFrame) {
      _frameInWindow = true;
    }
  }

  void noteSubmitTime(Nanos duration) {
    if (duration <= 0) {
      return;
    }
    // A recent estimate: a quarter of each new measure.
    _submitEstimate = _submitEstimate == 0
                          ? duration
                          : _submitEstimate + (duration - _submitEstimate) / 4;
  }

  void startRecordingIfDue(Nanos now, Actions *actions) {
    // One recording at a time, and none while one waits for the ready slot.
    // Holding one frame, the view starts the next once the window took the
    // ready one.
    if (!_recordingRequested || _recording || _waiting || (!_deep && _ready)) {
      return;
    }
    _recordingRequested = false;
    _recording = true;
    _active = true;
    // The frame the recording starts in, when its signal is the latest one.
    _recordingSignal =
        _interval > 0 && now >= _signalTime && now - _signalTime < _interval
            ? _signalTime
            : 0;
    actions->startRecording = true;
  }

  /**
   Measures a recording against the frame of the display: how far into the
   frame it started in it ended, or, when that frame is not known, how long
   it took.
   */
  void noteRecordingTime(Nanos now, Nanos duration) {
    if (_policy.depth != Depth::kAdaptive || _interval <= 0) {
      return;
    }
    Nanos spent = duration;
    if (_recordingSignal != 0 && now - _recordingSignal > spent) {
      spent = now - _recordingSignal;
    }
    const bool late = spent * 100 > _interval * kLatePercent;
    const bool fits = spent * 100 < _interval * kFitsPercent;
    if (late) {
      _stats.lateRecordings++;
    }
    if (_deep) {
      if (!fits) {
        _fits = 0;
        return;
      }
      if (_fits++ == 0) {
        _fitsSince = now;
      }
      if (_fits >= kFitsToGoShallow &&
          now - _fitsSince >= _interval * kFramesToGoShallow) {
        _deep = false;
        _fits = 0;
        _lateHistory = 0;
        _stats.depthChanges++;
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
      _deep = true;
      _fits = 0;
      _stats.depthChanges++;
    }
  }

  Policy _policy;

  // Record side: a recording was asked for and has not started; one is in
  // flight; the view's ready frame is queued; a recording that ended waits
  // for the ready slot.
  bool _recordingRequested = false;
  bool _recording = false;
  bool _ready = false;
  bool _waiting = false;
  // Depth: whether a recording starts as soon as the previous one ends, and
  // what the recent recordings say about it.
  bool _deep = false;
  int _fits = 0;
  Nanos _fitsSince = 0;
  unsigned _lateHistory = 0;
  Nanos _recordingSignal = 0;

  // Present side: the latest frame signal.
  Nanos _signalTime = 0;
  Nanos _interval = 0;
  Nanos _deadline = 0;
  bool _signalRequested = false;
  // When the window last took a frame (its submit started), and when a
  // frame last went to it: the same moment but for the submit, unless the
  // present was held.
  bool _taken = false;
  Nanos _lastTake = 0;
  bool _presented = false;
  Nanos _lastPresent = 0;
  // A window that shows the latest frame has one it has not drawn yet.
  bool _frameInWindow = false;
  // The window declined a frame: nothing is tried before the next signal.
  bool _declined = false;
  // The view recorded, submitted or presented since the last frame signal.
  bool _active = false;
  Nanos _submitEstimate = 0;
  // The frame that waits was counted as late for a deadline already.
  bool _missedDeadline = false;
  Stats _stats;
};

} // namespace rnsurface
