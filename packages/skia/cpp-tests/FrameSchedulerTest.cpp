// Host-side check of rnsurface::FrameScheduler (see run.sh). A simulator
// stands in for everything the scheduler paces: a display that announces each
// of its frames, a thread that records, a present thread that submits, and a
// GPU that works through what it is handed in order. Each case sets a scene
// (how long a recording, a submit and the GPU take) and reads what reached
// the window, so that each rule of the scheduler is a case that reads as the
// rule. A window that shows each frame stands in for a SurfaceView (and a
// CAMetalLayer), one that shows the latest frame for a TextureView.

#include <algorithm>
#include <cstdio>
#include <map>
#include <vector>

#include "rnsurface/FrameScheduler.h"

namespace {

using rnsurface::FrameScheduler;
using Nanos = FrameScheduler::Nanos;
using PresentMode = FrameScheduler::PresentMode;
using WaitForPreviousWork = FrameScheduler::WaitForPreviousWork;
using FramesInFlight = FrameScheduler::FramesInFlight;
using SubmitResult = FrameScheduler::SubmitResult;
using Actions = FrameScheduler::Actions;

int failures = 0;

void expect(bool condition, const char *what) {
  if (!condition) {
    std::fprintf(stderr, "FAIL: %s\n", what);
    failures++;
  }
}

void expectEqual(long long actual, long long expected, const char *what) {
  if (actual != expected) {
    std::fprintf(stderr, "FAIL: %s: expected %lld, got %lld\n", what, expected,
                 actual);
    failures++;
  }
}

void expectBetween(long long actual, long long low, long long high,
                   const char *what) {
  if (actual < low || actual > high) {
    std::fprintf(stderr, "FAIL: %s: expected %lld to %lld, got %lld\n", what,
                 low, high, actual);
    failures++;
  }
}

/**
 * The world around a scheduler. Time is in units of a thousandth of a frame
 * of the display by default (kFrame), so that 250 reads as a quarter of a
 * frame.
 */
class Sim {
public:
  static constexpr Nanos kFrame = 1000;

  explicit Sim(FrameScheduler::Policy policy) : scheduler(policy) {
    post(0, Event::kDisplayFrame);
  }

  FrameScheduler scheduler;

  // The scene ----------------------------------------------------------------

  // The display: a frame every `interval`, and how long after it starts a
  // frame presented still makes it. A CADisplayLink's deadline is just short
  // of the next frame; Android's can be past it.
  Nanos interval = kFrame;
  Nanos deadlineAfterFrameStart = 900;
  // How long a recording, a submit and the GPU take, per frame.
  Nanos recordTime = 100;
  Nanos submitTime = 50;
  Nanos gpuTime = 0;
  // What the window answers the next submits with, instead of taking the
  // frame; a frame is submitted once these run out.
  std::vector<SubmitResult> refusals;
  // Whether the window can show a frame: not in the background.
  bool canPresent = true;

  // What happened
  // --------------------------------------------------------------

  Nanos now = 0;
  // When a frame went to the window, when a recording started, and how many
  // frames were recorded.
  std::vector<Nanos> presents;
  std::vector<Nanos> recordingStarts;
  int recorded = 0;
  int animationFrames = 0;
  int deferredPresents = 0;
  int submittedWorkDonePolls = 0;
  // Frames waiting on the target.
  int queued = 0;
  bool presentDeferred = false;

  // Driving it
  // -----------------------------------------------------------------

  /** The content changes at `time`. */
  void changeContentAt(Nanos time) { post(time, Event::kContentChanged); }

  /**
   The content changes once a frame, `phase` after each animation frame starts,
   from `from` up to `until`: an animation driven from another thread's vsync.
   */
  void animate(Nanos from, Nanos until, Nanos phase) {
    for (Nanos time = from; time < until; time += interval) {
      changeContentAt(time + phase);
    }
  }

  /** A frame nobody paces is queued at `time`: a client's recording. */
  void queueClientFrameAt(Nanos time, bool urgent = false) {
    post(time, urgent ? Event::kUrgentClientFrame : Event::kClientFrame);
  }

  /** The window draws the frame it was given, at `time` (a TextureView). */
  void consumeAt(Nanos time) { post(time, Event::kWindowDraw); }

  void letWindowPresentAt(Nanos time) { post(time, Event::kCanPresent); }

  void runUntil(Nanos end) {
    while (!_events.empty() && _events.begin()->first <= end) {
      const auto [time, event] = *_events.begin();
      _events.erase(_events.begin());
      // The present thread does one thing at a time: what reaches it while
      // it submits waits for the submit to end, also what reaches it at the
      // very moment it ends.
      if (isPresentSide(event) && event != Event::kSubmitEnded &&
          (_submitting || time < _presentBusyUntil)) {
        post(std::max(time, _presentBusyUntil), event);
        continue;
      }
      now = std::max(now, time);
      handle(event);
    }
    now = std::max(now, end);
  }

  // Reading it
  // -----------------------------------------------------------------

  int presentsBetween(Nanos from, Nanos until) const {
    return static_cast<int>(
        std::count_if(presents.begin(), presents.end(), [&](Nanos time) {
          return time >= from && time < until;
        }));
  }

  /** The slot of the compositor a present at `time` lands in. */
  Nanos slotOf(Nanos time) const {
    // Slots end at the deadlines, which they include.
    return (time - deadlineAfterFrameStart + 100 * interval + interval - 1) /
           interval;
  }

  /** The most frames any slot of the compositor was given. */
  int mostPresentsInASlot() const {
    std::map<Nanos, int> perSlot;
    int most = 0;
    for (Nanos time : presents) {
      most = std::max(most, ++perSlot[slotOf(time)]);
    }
    return most;
  }

  FrameScheduler::WindowState windowState() const {
    FrameScheduler::WindowState state;
    state.canPresent = canPresent;
    state.queued = queued > 0;
    state.presentDeferred = presentDeferred;
    state.previousWorkDone = isPreviousWorkDone();
    return state;
  }

private:
  enum class Event {
    kDisplayFrame,
    kContentChanged,
    kRecordingFinished,
    kFrameQueued,
    kClientFrame,
    kUrgentClientFrame,
    kSubmitEnded,
    kSubmittedWorkDonePoll,
    kWindowDraw,
    kCanPresent,
  };

  static bool isPresentSide(Event event) {
    return event != Event::kContentChanged &&
           event != Event::kRecordingFinished;
  }

  void post(Nanos time, Event event) { _events.emplace(time, event); }

  bool isPreviousWorkDone() const {
    return scheduler.policy().waitForPreviousWork ==
               WaitForPreviousWork::kNever ||
           now >= _previousWorkDoneAt;
  }

  void handle(Event event) {
    switch (event) {
    case Event::kDisplayFrame:
      post(now - (now % interval) + interval, Event::kDisplayFrame);
      if (scheduler.hasPendingAnimationFrame()) {
        animationFrames++;
        const Nanos time = now - (now % interval);
        run(scheduler.onAnimationFrame(
            {time, interval, time + deadlineAfterFrameStart}, now,
            windowState()));
      }
      break;
    case Event::kContentChanged:
      run(scheduler.onRecordingRequested(now));
      break;
    case Event::kRecordingFinished:
      recorded++;
      run(scheduler.onRecordingFinished(now, recordTime, /* produced= */ true));
      break;
    case Event::kFrameQueued:
      run(scheduler.onFrameQueued(now, windowState(), /* urgent= */ false));
      break;
    case Event::kClientFrame:
      queued++;
      _clientFrames++;
      run(scheduler.onFrameQueued(now, windowState(), /* urgent= */ false));
      break;
    case Event::kUrgentClientFrame:
      queued++;
      _clientFrames++;
      run(scheduler.onFrameQueued(now, windowState(), /* urgent= */ true));
      break;
    case Event::kSubmitEnded:
      endSubmit();
      break;
    case Event::kSubmittedWorkDonePoll:
      _pollPosted = false;
      submittedWorkDonePolls++;
      run(scheduler.onSubmittedWorkDonePoll(now, windowState()));
      break;
    case Event::kWindowDraw:
      run(scheduler.onFrameConsumed(now, windowState()));
      break;
    case Event::kCanPresent:
      canPresent = true;
      run(scheduler.onCanPresent(now, windowState()));
      break;
    }
  }

  void run(const Actions &actions) {
    if (actions.queueRecording) {
      // Queued on the target, which tells the present thread in a task of
      // its own, never on the spot.
      queued++;
      post(now, Event::kFrameQueued);
    }
    if (actions.startRecording) {
      recordingStarts.push_back(now);
      post(now + recordTime, Event::kRecordingFinished);
    }
    if (actions.requestAnimationFrame) {
      expect(scheduler.hasPendingAnimationFrame(),
             "an animation frame asked for is one the scheduler has pending");
    }
    if (actions.pollSubmittedWorkDone && !_pollPosted) {
      // The poll that finds the GPU done: how often a host polls until then
      // is the host's business.
      _pollPosted = true;
      post(std::max(now + 1, _previousWorkDoneAt),
           Event::kSubmittedWorkDonePoll);
    }
    if (actions.submitFrame) {
      beginSubmit(actions.deferPresent);
    }
    if (actions.presentDeferredFrame) {
      expect(presentDeferred, "only a deferred present is presented as one");
      presentDeferred = false;
      present(_deferredWorkDoneAt);
      run(scheduler.onDeferredFramePresented(now, windowState()));
    }
  }

  void beginSubmit(bool deferPresent) {
    _deferPresent = deferPresent;
    if (!refusals.empty()) {
      const SubmitResult refusal = refusals.front();
      refusals.erase(refusals.begin());
      run(scheduler.onFrameSubmitted({refusal, 0}, now, windowState()));
      return;
    }
    if (queued == 0) {
      run(scheduler.onFrameSubmitted({SubmitResult::kNothing, 0}, now,
                                     windowState()));
      return;
    }
    queued--;
    // Clients' frames were queued first in every case that queues any.
    if (_clientFrames > 0) {
      _clientFrames--;
    } else {
      // The view's own frame leaves the ready slot as its submit starts, so
      // that the next recording overlaps it.
      run(scheduler.onReadyFrameTaken(now));
    }
    // A submit lasts what the scene says as it starts.
    _submitting = true;
    _submitTook = submitTime;
    _presentBusyUntil = now + submitTime;
    post(_presentBusyUntil, Event::kSubmitEnded);
  }

  void endSubmit() {
    _submitting = false;
    // The GPU works through what it is handed in order.
    const Nanos workDoneAt = std::max(_gpuFreeAt, now) + gpuTime;
    _gpuFreeAt = workDoneAt;
    if (scheduler.policy().waitForPreviousWork ==
            WaitForPreviousWork::kBeforePresent &&
        (_deferPresent || !isPreviousWorkDone())) {
      presentDeferred = true;
      deferredPresents++;
      _deferredWorkDoneAt = workDoneAt;
      run(scheduler.onFrameSubmitted(
          {SubmitResult::kPresentDeferred, _submitTook}, now, windowState()));
      return;
    }
    present(workDoneAt);
    run(scheduler.onFrameSubmitted({SubmitResult::kPresented, _submitTook}, now,
                                   windowState()));
  }

  void present(Nanos workDoneAt) {
    presents.push_back(now);
    // The next present waits for the GPU to be done with this frame.
    _previousWorkDoneAt = workDoneAt;
  }

  std::multimap<Nanos, Event> _events;
  Nanos _presentBusyUntil = 0;
  bool _submitting = false;
  Nanos _submitTook = 0;
  bool _deferPresent = false;
  Nanos _gpuFreeAt = 0;
  Nanos _previousWorkDoneAt = 0;
  Nanos _deferredWorkDoneAt = 0;
  int _clientFrames = 0;
  bool _pollPosted = false;
};

constexpr Nanos kFrame = Sim::kFrame;

FrameScheduler::Policy
eachFrame(WaitForPreviousWork wait,
          FramesInFlight framesInFlight = FramesInFlight::kAdaptive) {
  return {PresentMode::kFifo, wait, framesInFlight};
}

FrameScheduler::Policy latestFrame(WaitForPreviousWork wait) {
  return {PresentMode::kMailbox, wait, FramesInFlight::kAdaptive};
}

// One present per frame of the display ---------------------------------------

void aFrameWithoutAKnownSlotGoesOnTheNextAnimationFrame() {
  Sim sim(eachFrame(WaitForPreviousWork::kNever));
  sim.changeContentAt(300);
  sim.runUntil(900);
  expectEqual(sim.recorded, 1, "idle view: the change is recorded at once");
  expectEqual(static_cast<long long>(sim.presents.size()), 0,
              "idle view: nothing is presented before an animation frame");
  sim.runUntil(2 * kFrame);
  expectEqual(static_cast<long long>(sim.presents.size()), 1,
              "idle view: the frame goes on the animation frame");
  expectBetween(sim.presents[0], kFrame, kFrame + 100,
                "idle view: as that frame starts, not later");
}

void aFrameReadyBeforeTheDeadlineOfAFreeSlotGoesAtOnce() {
  Sim sim(eachFrame(WaitForPreviousWork::kNever));
  sim.changeContentAt(300);
  sim.runUntil(2 * kFrame + 50);
  // The view was active: its animation frames keep coming for now, and the
  // slot of the frame that starts at 2000 has no frame yet.
  sim.changeContentAt(2 * kFrame + 200);
  sim.runUntil(3 * kFrame - 1);
  expectEqual(
      static_cast<long long>(sim.presents.size()), 2,
      "free slot: the frame does not wait for the next animation frame");
  expectBetween(sim.presents[1], 2 * kFrame + 300, 2 * kFrame + 400,
                "free slot: presented as soon as it is submitted");
}

void aSlotGetsOneFrame() {
  Sim sim(eachFrame(WaitForPreviousWork::kNever));
  // Two changes in each frame of the display, both recorded in time.
  sim.animate(0, 20 * kFrame, 100);
  sim.animate(0, 20 * kFrame, 500);
  sim.runUntil(22 * kFrame);
  expectEqual(sim.mostPresentsInASlot(), 1,
              "one present per frame: no slot gets two");
  expectBetween(sim.presentsBetween(2 * kFrame, 20 * kFrame), 17, 18,
                "one present per frame: a frame each");
}

void aMissedDeadlineSkipsTheFrame() {
  Sim sim(eachFrame(WaitForPreviousWork::kNever));
  sim.changeContentAt(300);
  sim.runUntil(2 * kFrame + 50);
  // Ready 50 before the next animation frame, past the deadline (100 before
  // it).
  sim.recordTime = 700;
  sim.changeContentAt(2 * kFrame + 250);
  sim.runUntil(3 * kFrame - 1);
  expectEqual(static_cast<long long>(sim.presents.size()), 1,
              "missed deadline: the frame does not go late");
  sim.runUntil(4 * kFrame - 1);
  expectEqual(static_cast<long long>(sim.presents.size()), 2,
              "missed deadline: it goes on the next animation frame");
  expectBetween(sim.presents[1], 3 * kFrame, 3 * kFrame + 100,
                "missed deadline: as it starts");
  expect(sim.scheduler.framesInFlight() == 1,
         "missed deadline: the frames in flight do not change");
}

void aSubmitThatWouldMissTheDeadlineWaitsForTheAnimationFrame() {
  // The same frame, ready 400 or 200 before the deadline, with a submit that
  // takes 300.
  const auto presentedAt = [](Nanos recordTime) {
    Sim sim(eachFrame(WaitForPreviousWork::kNever));
    sim.submitTime = 300;
    sim.animate(0, 5 * kFrame, 100);
    // The last of these frames goes at 5000, and the animation frame at 6000
    // finds the view idle: its slot, which ends at 6900, has no frame.
    sim.runUntil(6 * kFrame + 50);
    sim.recordTime = recordTime;
    sim.changeContentAt(6 * kFrame + 200);
    sim.runUntil(9 * kFrame);
    return sim.presents.back();
  };
  expectBetween(presentedAt(300), 6 * kFrame + 800, 6 * kFrame + 810,
                "submit estimate: a frame that makes the deadline goes");
  expectBetween(presentedAt(500), 7 * kFrame + 300, 7 * kFrame + 310,
                "submit estimate: one that would land late waits for the "
                "animation frame");
}

void oneLongSubmitSaysNothingOfTheNext() {
  Sim sim(eachFrame(WaitForPreviousWork::kNever));
  // The first frame compiles its pipelines: its submit lasts twenty frames
  // of the display. It is submitted on the animation frame at 1000 and
  // presented at 21850, 50 before the deadline of the slot it lands in.
  sim.submitTime = 20 * kFrame + 850;
  sim.queueClientFrameAt(100);
  sim.queueClientFrameAt(110);
  sim.runUntil(2 * kFrame);
  sim.submitTime = 50;
  sim.runUntil(22 * kFrame - 1);
  expectEqual(
      static_cast<long long>(sim.presents.size()), 1,
      "long first submit: the next frame is not submitted into the slot "
      "the first landed in on the strength of that submit");
  sim.runUntil(23 * kFrame);
  expectEqual(static_cast<long long>(sim.presents.size()), 2,
              "long first submit: it goes on the next animation frame");
  expectEqual(sim.mostPresentsInASlot(), 1,
              "long first submit: one frame per slot");
  // A frame ready before the deadline of a free slot goes at once all the
  // same: the long submit is not what the next one is expected to take.
  sim.changeContentAt(23 * kFrame + 100);
  sim.runUntil(24 * kFrame - 1);
  expectBetween(
      sim.presents.back(), 23 * kFrame + 200, 23 * kFrame + 300,
      "long first submit: a frame still goes between two animation frames");
  expectEqual(sim.mostPresentsInASlot(), 1,
              "long first submit: one frame per slot afterwards");
}

void aSubmitNeverCountsForMoreThanAFrame() {
  FrameScheduler scheduler(eachFrame(WaitForPreviousWork::kNever));
  FrameScheduler::WindowState window;
  // Two redraws before any animation frame, each thirty frames long: the frame
  // of the display is not known yet.
  scheduler.onFrameSubmitted({SubmitResult::kPresented, 30 * kFrame},
                             30 * kFrame, window);
  expectEqual(scheduler.submitEstimate(), 0,
              "submit estimate: one submit alone is not an estimate");
  scheduler.onFrameSubmitted({SubmitResult::kPresented, 30 * kFrame},
                             60 * kFrame, window);
  expectEqual(scheduler.submitEstimate(), 30 * kFrame,
              "submit estimate: two long submits are");
  scheduler.onAnimationFrame({61 * kFrame, kFrame, 61 * kFrame + 900},
                             61 * kFrame, window);
  expectEqual(scheduler.submitEstimate(), kFrame,
              "submit estimate: a frame at most once the frame is known");
  // Short submits from now on, but for a long one: it leaves no trace.
  for (Nanos frame = 62; frame < 82; frame++) {
    scheduler.onFrameSubmitted({SubmitResult::kPresented, 50}, frame * kFrame,
                               window);
  }
  expectBetween(scheduler.submitEstimate(), 50, 60,
                "submit estimate: follows the submits");
  scheduler.onFrameSubmitted({SubmitResult::kPresented, 30 * kFrame},
                             112 * kFrame, window);
  scheduler.onFrameSubmitted({SubmitResult::kPresented, 50}, 113 * kFrame,
                             window);
  expectBetween(scheduler.submitEstimate(), 50, 60,
                "submit estimate: one long submit does not move it");
}

void aSlowSubmitNeverStarvesTheWindow() {
  Sim sim(eachFrame(WaitForPreviousWork::kNever));
  // A submit longer than a frame: no frame could ever make a deadline.
  sim.submitTime = 1300;
  sim.animate(0, 30 * kFrame, 100);
  sim.runUntil(32 * kFrame);
  // 26 frames of the display, a submit every 1.3 of them.
  expectBetween(sim.presentsBetween(4 * kFrame, 30 * kFrame), 19, 20,
                "slow submit: the rate the submit allows, not none");
}

void aLongSubmitStartsOnEachAnimationFrameWhereverTheDeadlineIs() {
  // A submit of most of a frame ends in the slot after the one it started
  // in when the deadline falls in the middle of the frame: the next frame
  // still goes on the next animation frame, into a slot of its own.
  for (Nanos deadline : {900, 1500, 2300}) {
    Sim sim(eachFrame(WaitForPreviousWork::kNever, FramesInFlight::kTwo));
    sim.deadlineAfterFrameStart = deadline;
    sim.submitTime = 850;
    sim.recordTime = 1300;
    sim.animate(0, 400 * kFrame, 100);
    sim.runUntil(400 * kFrame);
    // 360 frames of the display, a recording every 1.3 of them.
    expectBetween(sim.presentsBetween(40 * kFrame, 400 * kFrame), 272, 278,
                  "long submit: the rate the recording allows");
    expectEqual(sim.mostPresentsInASlot(), 1, "long submit: one frame a slot");
  }
}

void clientsFramesGoOneAFrame() {
  Sim sim(eachFrame(WaitForPreviousWork::kNever));
  sim.queueClientFrameAt(100);
  sim.queueClientFrameAt(110);
  sim.queueClientFrameAt(120);
  sim.runUntil(5 * kFrame);
  expectEqual(static_cast<long long>(sim.presents.size()), 3,
              "client frames: all of them are shown");
  expectEqual(sim.mostPresentsInASlot(), 1, "client frames: one per frame");
  expectBetween(sim.presents[2], 3 * kFrame, 3 * kFrame + 100,
                "client frames: on three animation frames in a row");
}

void aDeadlinePastTheNextAnimationFrameStillGivesEachSlotOneFrame() {
  // Android's frame timeline: a frame can be presented until a third of a
  // frame past the next animation frame and still make it.
  Sim sim(eachFrame(WaitForPreviousWork::kNever));
  sim.deadlineAfterFrameStart = 1300;
  sim.animate(0, 40 * kFrame, 100);
  sim.runUntil(42 * kFrame);
  expectEqual(sim.mostPresentsInASlot(), 1,
              "late deadline: no slot of the compositor gets two frames");
  expectBetween(sim.presentsBetween(4 * kFrame, 40 * kFrame), 35, 36,
                "late deadline: a frame each");
}

void aBurstOfFramesGoesOneASlotWhereverTheDeadlineIs() {
  // From a CADisplayLink's deadline, short of the next animation frame, to a
  // frame timeline's, up to three frames past the start of its frame.
  for (Nanos deadline : {900, 1000, 1300, 2000, 2300, 3100}) {
    Sim sim(eachFrame(WaitForPreviousWork::kNever));
    sim.deadlineAfterFrameStart = deadline;
    // Frames keep coming, so that the slots are known; then twenty at once,
    // and more a few at a time, a quarter of a frame apart.
    sim.animate(0, 10 * kFrame, 100);
    for (int frame = 0; frame < 20; frame++) {
      sim.queueClientFrameAt(10 * kFrame + 50);
    }
    for (Nanos time = 12 * kFrame; time < 20 * kFrame; time += 250) {
      sim.queueClientFrameAt(time);
    }
    sim.runUntil(80 * kFrame);
    expectEqual(sim.queued, 0, "burst: every frame is shown");
    expectEqual(sim.mostPresentsInASlot(), 1,
                "burst: no slot of the compositor gets two frames");
  }
}

void anUrgentFrameGoesAtOnceButNotTwiceInASlot() {
  Sim sim(eachFrame(WaitForPreviousWork::kNever));
  // A first frame, so that the view knows the display's frames; then it is
  // idle, and no animation frame comes.
  sim.changeContentAt(300);
  sim.runUntil(3 * kFrame + 900);
  expectEqual(static_cast<long long>(sim.presents.size()), 1,
              "urgent: a first frame was shown");
  // Past the deadline at 3900, with no animation frame to say so.
  sim.queueClientFrameAt(3 * kFrame + 950, /* urgent= */ true);
  sim.runUntil(4 * kFrame + 10);
  expectEqual(static_cast<long long>(sim.presents.size()), 2,
              "urgent: goes at once, without an animation frame");
  sim.queueClientFrameAt(4 * kFrame + 50, /* urgent= */ true);
  sim.runUntil(5 * kFrame - 1);
  expectEqual(static_cast<long long>(sim.presents.size()), 2,
              "urgent: the slot has its frame, the second waits");
  sim.runUntil(5 * kFrame + 100);
  expectEqual(static_cast<long long>(sim.presents.size()), 3,
              "urgent: the second goes on the next animation frame");
  expectEqual(sim.mostPresentsInASlot(), 1, "urgent: one frame per slot");
}

void anUrgentFrameDoesNotJoinAFramePresentedLate() {
  for (WaitForPreviousWork wait :
       {WaitForPreviousWork::kNever, WaitForPreviousWork::kBeforePresent}) {
    Sim sim(eachFrame(wait));
    // A CADisplayLink's deadline: the slots end 750 after each animation frame
    // starts.
    sim.deadlineAfterFrameStart = 750;
    sim.animate(0, 5 * kFrame, 100);
    sim.runUntil(5 * kFrame + 900);
    // A frame submitted on the animation frame at 6000, whose submit runs past
    // the deadline at 6750: it is presented at 6800, in the next slot.
    sim.submitTime = 800;
    sim.queueClientFrameAt(5 * kFrame + 950);
    sim.runUntil(6 * kFrame + 500);
    sim.submitTime = 50;
    const auto presentsSoFar = static_cast<long long>(sim.presents.size());
    // A frame for the window as resized, right behind it: that slot has its
    // frame, though the window took it in the slot before.
    sim.queueClientFrameAt(6 * kFrame + 810, /* urgent= */ true);
    sim.runUntil(7 * kFrame + 750);
    expectEqual(static_cast<long long>(sim.presents.size()), presentsSoFar + 1,
                "urgent, late frame: it does not join the frame presented "
                "late");
    sim.runUntil(9 * kFrame);
    expectEqual(static_cast<long long>(sim.presents.size()), presentsSoFar + 2,
                "urgent, late frame: it goes into the next slot");
    if (wait == WaitForPreviousWork::kBeforePresent) {
      expectEqual(sim.deferredPresents, 1,
                  "urgent, late frame: its work goes to the GPU at once where "
                  "a present can be deferred");
      expectBetween(sim.presents.back(), 7 * kFrame + 750, 7 * kFrame + 760,
                    "urgent, late frame: and its present as the next slot "
                    "starts");
    }
    expectEqual(sim.mostPresentsInASlot(), 1,
                "urgent, late frame: one frame per slot");
  }
}

// No present before the previous work is done ------------------------------

void aPresentIsDeferredUntilThePreviousWorkIsDone() {
  Sim sim(eachFrame(WaitForPreviousWork::kBeforePresent));
  // The GPU takes a frame and a half per frame.
  sim.gpuTime = 1500;
  sim.queueClientFrameAt(100);
  sim.queueClientFrameAt(110);
  sim.queueClientFrameAt(120);
  sim.runUntil(2 * kFrame + 100);
  // The first went on the animation frame at 1000 (submitted by 1050, done by
  // 2550); the second was submitted on the animation frame at 2000 and its
  // present is deferred.
  expectEqual(static_cast<long long>(sim.presents.size()), 1,
              "deferred: the second frame is not presented yet");
  expect(sim.presentDeferred,
         "deferred: its work is submitted, its present deferred");
  expectEqual(sim.queued, 1,
              "deferred: the window takes no other frame meanwhile");
  sim.runUntil(3 * kFrame - 1);
  expectEqual(static_cast<long long>(sim.presents.size()), 2,
              "deferred: the previous work being done releases it");
  expectBetween(sim.presents[1], 2550, 2560,
                "deferred: when the GPU is done, not on an animation frame");
  expectEqual(sim.queued, 1,
              "deferred: the third waits for an animation frame, as any frame");
  sim.runUntil(8 * kFrame);
  expectEqual(static_cast<long long>(sim.presents.size()), 3,
              "deferred: every frame is shown in the end");
}

void aPresentIsNotDeferredOnceThePreviousWorkIsDone() {
  Sim sim(eachFrame(WaitForPreviousWork::kBeforePresent));
  sim.gpuTime = 300;
  sim.animate(0, 20 * kFrame, 100);
  sim.runUntil(22 * kFrame);
  expectEqual(sim.deferredPresents, 0,
              "light scene: no present is ever deferred");
  expectEqual(sim.submittedWorkDonePolls, 0,
              "light scene: the previous work is never polled for");
  expectEqual(static_cast<long long>(sim.scheduler.stats().polls), 0,
              "light scene: and the scheduler counts no poll");
}

void noSlotGetsTwoFramesWhateverTheGpuDoes() {
  // A GPU that takes anything from a quarter of a frame to almost two over
  // each frame, in no order: presents are deferred and released early or late
  // in a slot, and a frame submitted behind one released late must not join
  // it.
  for (Nanos deadline : {900, 1500, 2300}) {
    for (Nanos submitTime : {150, 450, 850}) {
      Sim sim(eachFrame(WaitForPreviousWork::kBeforePresent));
      sim.deadlineAfterFrameStart = deadline;
      sim.submitTime = submitTime;
      sim.animate(0, 2000 * kFrame, 100);
      unsigned long long seed = 12345;
      const Nanos gpuTimes[] = {250, 400, 650, 900, 1350, 1600, 1900};
      for (Nanos frame = 0; frame < 2000; frame++) {
        seed = seed * 6364136223846793005ULL + 1442695040888963407ULL;
        sim.gpuTime = gpuTimes[(seed >> 33) % 7];
        sim.runUntil(frame * kFrame + 50);
      }
      sim.runUntil(2010 * kFrame);
      expect(sim.deferredPresents > 100, "any GPU: presents are deferred");
      expectEqual(sim.mostPresentsInASlot(), 1,
                  "any GPU: no slot of the compositor gets two frames");
      expectEqual(static_cast<long long>(sim.presents.size()), sim.recorded,
                  "any GPU: every frame recorded is presented");
    }
  }
}

void waitingBeforeSubmitLeavesTheFrameQueued() {
  Sim sim(eachFrame(WaitForPreviousWork::kBeforeSubmit));
  sim.gpuTime = 1500;
  sim.queueClientFrameAt(100);
  sim.queueClientFrameAt(110);
  sim.runUntil(2 * kFrame + 100);
  expectEqual(static_cast<long long>(sim.presents.size()), 1,
              "wait before submit: the second frame is not presented yet");
  expect(!sim.presentDeferred, "wait before submit: no present is deferred");
  expectEqual(sim.queued, 1, "wait before submit: it stays queued");
  sim.runUntil(3 * kFrame - 1);
  expectEqual(static_cast<long long>(sim.presents.size()), 2,
              "wait before submit: it goes once the GPU is done");
  expectBetween(
      sim.presents[1], 2600, 2610,
      "wait before submit: its submit starts once the previous work is done");
}

void deferringThePresentKeepsAGpuBoundViewAtTheGpusRate() {
  // The GPU takes a frame and a fifth per frame, a submit a fifth of one.
  const auto frames = [](WaitForPreviousWork wait) {
    Sim sim(eachFrame(wait, FramesInFlight::kTwo));
    sim.gpuTime = 1200;
    sim.submitTime = 200;
    sim.animate(0, 200 * kFrame, 100);
    sim.runUntil(200 * kFrame);
    expectEqual(sim.mostPresentsInASlot(), 1,
                "GPU-bound: no slot gets two frames");
    return sim.presentsBetween(20 * kFrame, 200 * kFrame);
  };
  // 180 frames of the display: the GPU can do 150 frames in that time.
  const int beforePresent = frames(WaitForPreviousWork::kBeforePresent);
  const int beforeSubmit = frames(WaitForPreviousWork::kBeforeSubmit);
  expectBetween(beforePresent, 146, 151,
                "wait before present: the GPU never idles");
  expectBetween(beforeSubmit, 110, 131,
                "wait before submit: the GPU idles while the next frame is "
                "submitted");
  expect(beforePresent > beforeSubmit,
         "waiting before the present shows more frames than before the submit");
}

void deferringThePresentKeepsTheGpuFedThroughALongSubmit() {
  // The Samsung's heaviest scene: a submit of most of a frame, a GPU that
  // takes 1.7 frames, a deadline in the middle of the frame.
  for (Nanos deadline : {900, 1500, 2300}) {
    Sim sim(
        eachFrame(WaitForPreviousWork::kBeforePresent, FramesInFlight::kTwo));
    sim.deadlineAfterFrameStart = deadline;
    sim.gpuTime = 1700;
    sim.submitTime = 850;
    sim.recordTime = 1300;
    sim.animate(0, 400 * kFrame, 100);
    sim.runUntil(400 * kFrame);
    // 360 frames of the display: the GPU can do 211 frames in that time.
    expectBetween(sim.presentsBetween(40 * kFrame, 400 * kFrame), 207, 212,
                  "deferred, long submit: the GPU never idles");
    expectEqual(sim.mostPresentsInASlot(), 1,
                "deferred, long submit: one frame a slot");
  }
}

// A bounded pipeline ---------------------------------------------------------

void withOneFrameInFlightTheNextRecordingWaitsForTheWindow() {
  Sim sim(eachFrame(WaitForPreviousWork::kNever));
  sim.changeContentAt(100);
  sim.changeContentAt(400);
  sim.runUntil(900);
  expectEqual(static_cast<long long>(sim.recordingStarts.size()), 1,
              "one frame in flight: no recording while the ready frame waits");
  sim.runUntil(2 * kFrame);
  expectEqual(static_cast<long long>(sim.recordingStarts.size()), 2,
              "one frame in flight: the next starts once the window took it");
  expectBetween(sim.recordingStarts[1], kFrame, kFrame + 10,
                "one frame in flight: as its submit starts, not after it");
}

void requestsWhileRecordingAreOneRequest() {
  Sim sim(eachFrame(WaitForPreviousWork::kNever));
  sim.recordTime = 300;
  for (Nanos time = 100; time < 400; time += 10) {
    sim.changeContentAt(time);
  }
  sim.runUntil(3 * kFrame);
  expectEqual(sim.recorded, 2,
              "coalescing: one recording in flight, one for all the rest");
}

void withTwoFramesInFlightARecordingThatFinishesEarlyWaitsAndNoneStarts() {
  Sim sim(eachFrame(WaitForPreviousWork::kNever, FramesInFlight::kTwo));
  // Nothing is submitted before the first animation frame at 1000.
  for (Nanos time = 100; time < 900; time += 50) {
    sim.changeContentAt(time);
  }
  sim.runUntil(900);
  expectEqual(sim.recorded, 2,
              "two frames in flight: one ready, one behind it");
  expectEqual(sim.queued, 1, "two frames in flight: one frame on the target");
  expect(sim.scheduler.hasWaitingRecording(),
         "two frames in flight: the second waits for the ready slot");
  expectEqual(static_cast<long long>(sim.recordingStarts.size()), 2,
              "two frames in flight: no third recording starts");
  sim.runUntil(kFrame + 300);
  expectEqual(
      sim.queued, 1,
      "two frames in flight: the one that waited is ready once the first "
      "is taken");
  expectEqual(static_cast<long long>(sim.recordingStarts.size()), 3,
              "two frames in flight: and the next recording starts");
}

void aFrameTheWindowGivesBackIsTheReadyFrameAgain() {
  FrameScheduler scheduler(eachFrame(WaitForPreviousWork::kNever));
  expect(scheduler.onRecordingRequested(100).startRecording,
         "given back: a first recording starts");
  expect(scheduler.onRecordingFinished(200, 100, true).queueRecording,
         "given back: it is the ready frame");
  // The window takes it, the next recording starts, and the window then has
  // no drawable for it after all.
  scheduler.onRecordingRequested(250);
  expect(scheduler.onReadyFrameTaken(300).startRecording,
         "given back: the next recording starts as the window takes it");
  scheduler.onReadyFrameReturned();
  expect(scheduler.hasReadyFrame(), "given back: the frame is ready again");
  expect(!scheduler.onRecordingFinished(400, 100, true).queueRecording,
         "given back: the recording that finished meanwhile waits behind it");
  expect(scheduler.hasWaitingRecording(), "given back: one waits");
  expect(scheduler.onReadyFrameTaken(500).queueRecording,
         "given back: and is ready once the window took the first");
}

void everyFrameRecordedIsShown() {
  for (FramesInFlight framesInFlight :
       {FramesInFlight::kAdaptive, FramesInFlight::kTwo}) {
    for (Nanos recordTime : {100, 600, 900, 1300, 2700}) {
      Sim sim(eachFrame(WaitForPreviousWork::kBeforePresent, framesInFlight));
      sim.recordTime = recordTime;
      sim.gpuTime = 700;
      sim.animate(0, 100 * kFrame, 150);
      sim.animate(0, 100 * kFrame, 600);
      sim.runUntil(120 * kFrame);
      expectEqual(static_cast<long long>(sim.presents.size()), sim.recorded,
                  "bounded pipeline: every frame recorded is presented");
      expectEqual(sim.queued, 0, "bounded pipeline: nothing is left queued");
      expectEqual(sim.mostPresentsInASlot(), 1,
                  "bounded pipeline: one frame per slot");
    }
  }
}

// The frames in flight follow the measured time -----------------------------

void aRecordingThatFitsKeepsOneFrameInFlight() {
  Sim sim(eachFrame(WaitForPreviousWork::kNever));
  sim.recordTime = 300;
  sim.animate(0, 100 * kFrame, 100);
  sim.runUntil(102 * kFrame);
  expect(sim.scheduler.framesInFlight() == 1, "fits: one frame in flight");
  expectBetween(sim.presentsBetween(4 * kFrame, 100 * kFrame), 95, 96,
                "fits: a frame each");
}

void aRecordingLongerThanAFrameOverlapsThePresents() {
  // 120 Hz, a recording of 10 ms: a frame is 8333 units here.
  Sim sim(eachFrame(WaitForPreviousWork::kNever));
  sim.interval = 8333;
  sim.deadlineAfterFrameStart = 7500;
  sim.recordTime = 10000;
  sim.submitTime = 300;
  sim.animate(0, 1200 * 8333, 800);
  sim.runUntil(1200 * 8333);
  expect(sim.scheduler.framesInFlight() == 2,
         "long recording: two frames in flight");
  // 1000 frames of the display, 8.333 s: a recording every 10 ms is 833
  // frames, where a recording that waited for each present would show 500.
  expectBetween(sim.presentsBetween(200 * 8333, 1200 * 8333), 820, 834,
                "long recording: the rate the recording allows");
}

void oneLateRecordingDoesNotChangeTheFramesInFlight() {
  Sim sim(eachFrame(WaitForPreviousWork::kNever));
  sim.animate(0, 12 * kFrame, 100);
  sim.runUntil(5 * kFrame + 50);
  sim.recordTime = 950;
  sim.runUntil(6 * kFrame + 50);
  sim.recordTime = 100;
  sim.runUntil(14 * kFrame);
  expect(sim.scheduler.framesInFlight() == 1,
         "one spike: still one frame in flight");
}

void twoLateRecordingsOutOfFourPutTwoFramesInFlightAndASecondOfFitsComesBack() {
  Sim sim(eachFrame(WaitForPreviousWork::kNever));
  sim.recordTime = 950;
  sim.animate(0, 200 * kFrame, 100);
  sim.runUntil(6 * kFrame);
  expect(sim.scheduler.framesInFlight() == 2,
         "late recordings: two frames in flight");
  sim.recordTime = 100;
  sim.runUntil(6 * kFrame +
               (FrameScheduler::kFramesForOneInFlight - 5) * kFrame);
  expect(sim.scheduler.framesInFlight() == 2,
         "hysteresis: not back before recordings fit for long enough");
  sim.runUntil(6 * kFrame +
               (FrameScheduler::kFramesForOneInFlight + 5) * kFrame);
  expect(sim.scheduler.framesInFlight() == 1,
         "hysteresis: back once they have for about a second");
}

void aViewDisturbedNowAndThenKeepsTwoFramesInFlight() {
  Sim sim(eachFrame(WaitForPreviousWork::kNever));
  sim.animate(0, 400 * kFrame, 100);
  int changes = 0;
  bool two = false;
  for (Nanos frame = 0; frame < 400; frame++) {
    // Two late recordings every forty frames: three times a second at
    // 120 Hz.
    sim.recordTime = frame % 40 < 2 ? 950 : 100;
    sim.runUntil(frame * kFrame + 50);
    if ((sim.scheduler.framesInFlight() == 2) != two) {
      two = !two;
      changes++;
    }
  }
  expectEqual(
      changes, 1,
      "disturbed: the frames in flight change once, not at each disturbance");
  expect(sim.scheduler.framesInFlight() == 2,
         "disturbed: two frames in flight");
}

void aRecordingThatHoversAroundAFrameDoesNotFlipTheFramesInFlight() {
  Sim sim(eachFrame(WaitForPreviousWork::kNever));
  sim.animate(0, 200 * kFrame, 100);
  int switches = 0;
  bool two = false;
  for (Nanos frame = 0; frame < 200; frame++) {
    // Between 70% and 100% of a frame, back and forth.
    sim.recordTime = 700 + (frame % 4) * 100;
    sim.runUntil(frame * kFrame + 50);
    if ((sim.scheduler.framesInFlight() == 2) != two) {
      two = !two;
      switches++;
    }
  }
  expectEqual(switches, 1,
              "hovering: the frames in flight settle, they do not flip");
}

void twoFramesInFlightByPolicyNeverChange() {
  Sim sim(eachFrame(WaitForPreviousWork::kNever, FramesInFlight::kTwo));
  sim.animate(0, 60 * kFrame, 100);
  sim.runUntil(62 * kFrame);
  expect(sim.scheduler.framesInFlight() == 2,
         "fixed by policy: two frames in flight throughout");
}

// A window that shows the latest frame ---------------------------------------

void aTextureViewTakesAFrameAtOnceWhileItHasNone() {
  Sim sim(latestFrame(WaitForPreviousWork::kNever));
  sim.changeContentAt(300);
  sim.runUntil(600);
  expectEqual(static_cast<long long>(sim.presents.size()), 1,
              "latest frame: presented without an animation frame");
}

void aTextureViewTakesTheNextFrameOnceItDrewThePrevious() {
  Sim sim(latestFrame(WaitForPreviousWork::kNever));
  sim.queueClientFrameAt(100);
  sim.queueClientFrameAt(110);
  sim.runUntil(5 * kFrame);
  expectEqual(static_cast<long long>(sim.presents.size()), 1,
              "latest frame: one at a time, whatever animation frames pass");
  sim.consumeAt(5 * kFrame + 200);
  sim.runUntil(5 * kFrame + 400);
  expectEqual(static_cast<long long>(sim.presents.size()), 2,
              "latest frame: the next goes once the window drew");
  sim.consumeAt(5 * kFrame + 500);
  sim.runUntil(7 * kFrame);
  expectEqual(static_cast<long long>(sim.presents.size()), 2,
              "latest frame: a draw with nothing queued presents nothing");
}

void anUrgentFrameReplacesTheOneATextureViewHasNotDrawn() {
  Sim sim(latestFrame(WaitForPreviousWork::kNever));
  sim.queueClientFrameAt(100);
  sim.queueClientFrameAt(300, /* urgent= */ true);
  sim.runUntil(600);
  expectEqual(static_cast<long long>(sim.presents.size()), 2,
              "latest frame: a frame for a resized window does not wait for "
              "the draw");
}

void aFrameWithoutAWindowTextureIsTriedOnTheNextAnimationFrame() {
  for (PresentMode presentMode : {PresentMode::kFifo, PresentMode::kMailbox}) {
    Sim sim(
        {presentMode, WaitForPreviousWork::kNever, FramesInFlight::kAdaptive});
    sim.queueClientFrameAt(100);
    sim.runUntil(kFrame + 100);
    const auto presentsSoFar = sim.presents.size();
    sim.consumeAt(kFrame + 150);
    // No drawable for the next frame.
    sim.refusals.push_back(SubmitResult::kNoTexture);
    sim.queueClientFrameAt(presentMode == PresentMode::kFifo ? 2 * kFrame - 50
                                                             : kFrame + 200);
    sim.runUntil(2 * kFrame - 1);
    if (presentMode == PresentMode::kMailbox) {
      expectEqual(static_cast<long long>(sim.presents.size()),
                  static_cast<long long>(presentsSoFar),
                  "no texture: not tried again before an animation frame");
    }
    sim.runUntil(4 * kFrame);
    expectEqual(static_cast<long long>(sim.presents.size()),
                static_cast<long long>(presentsSoFar) + 1,
                "no texture: tried again on an animation frame");
  }
}

// The window comes and goes --------------------------------------------------

void withoutAWindowFramesAreRecordedAndWait() {
  Sim sim({PresentMode::kNone, WaitForPreviousWork::kNever,
           FramesInFlight::kAdaptive});
  sim.animate(0, 10 * kFrame, 100);
  sim.runUntil(12 * kFrame);
  expectEqual(sim.recorded, 1, "no window: one frame is recorded, and waits");
  expectEqual(sim.animationFrames, 0,
              "no window: no animation frame is asked for");
  expectEqual(static_cast<long long>(sim.presents.size()), 0,
              "no window: nothing is presented");
}

void aWindowThatCannotShowAFrameIsLeftAloneUntilItCan() {
  Sim sim(eachFrame(WaitForPreviousWork::kNever));
  // The app is in the background.
  sim.canPresent = false;
  sim.queueClientFrameAt(100);
  sim.animate(0, 10 * kFrame, 100);
  sim.runUntil(10 * kFrame);
  expectEqual(static_cast<long long>(sim.presents.size()), 0,
              "cannot present: nothing is presented");
  expectEqual(sim.animationFrames, 0,
              "cannot present: no animation frame is asked for meanwhile");
  expectEqual(sim.recorded, 1,
              "cannot present: one frame is recorded, and waits");
  sim.letWindowPresentAt(10 * kFrame + 100);
  sim.runUntil(14 * kFrame);
  // The client's frame, the frame that waited, and one more for everything
  // that changed meanwhile.
  expectEqual(static_cast<long long>(sim.presents.size()), 3,
              "cannot present: the frames go once the window can show them");
  expectEqual(sim.recorded, 2,
              "cannot present: what changed meanwhile is one recording");
}

void anIdleViewAsksForNoAnimationFrames() {
  Sim sim(eachFrame(WaitForPreviousWork::kNever));
  sim.animate(0, 10 * kFrame, 100);
  sim.runUntil(40 * kFrame);
  // An animation frame per frame presented, and one after the last to find
  // the view idle: a display link pauses then.
  expectBetween(sim.animationFrames, 10, 12,
                "idle: the animation frames stop with the frames");
  expect(!sim.scheduler.hasPendingAnimationFrame(),
         "idle: a display link is told it may pause");
}

void cancelForgetsTheAnimationFrameAndTheFrameInTheWindow() {
  FrameScheduler scheduler(latestFrame(WaitForPreviousWork::kNever));
  FrameScheduler::WindowState window;
  window.queued = true;
  expect(scheduler.onFrameQueued(100, window, false).submitFrame,
         "cancel: a first frame goes to the window");
  auto actions =
      scheduler.onFrameSubmitted({SubmitResult::kPresented, 10}, 110, window);
  expect(!actions.submitFrame, "cancel: the second waits for the draw");
  expect(scheduler.hasPendingAnimationFrame(),
         "cancel: an animation frame is asked for");
  scheduler.cancel();
  expect(!scheduler.hasPendingAnimationFrame(),
         "cancel: the animation frame is forgotten");
  expect(scheduler.onFrameQueued(200, window, false).submitFrame,
         "cancel: so is the frame the window had");
}

void aWindowOfAnotherKindHasDrawnNothingYet() {
  FrameScheduler scheduler(latestFrame(WaitForPreviousWork::kNever));
  FrameScheduler::WindowState window;
  window.queued = true;
  scheduler.onFrameQueued(100, window, false);
  scheduler.onFrameSubmitted({SubmitResult::kPresented, 10}, 110, window);
  scheduler.setPresentMode(PresentMode::kFifo);
  scheduler.setPresentMode(PresentMode::kMailbox);
  expect(scheduler.onFrameQueued(200, window, false).submitFrame,
         "new window: it takes a frame at once");
}

} // namespace

int main() {
  aFrameWithoutAKnownSlotGoesOnTheNextAnimationFrame();
  aFrameReadyBeforeTheDeadlineOfAFreeSlotGoesAtOnce();
  aSlotGetsOneFrame();
  aMissedDeadlineSkipsTheFrame();
  aSubmitThatWouldMissTheDeadlineWaitsForTheAnimationFrame();
  oneLongSubmitSaysNothingOfTheNext();
  aSubmitNeverCountsForMoreThanAFrame();
  aSlowSubmitNeverStarvesTheWindow();
  aLongSubmitStartsOnEachAnimationFrameWhereverTheDeadlineIs();
  clientsFramesGoOneAFrame();
  aDeadlinePastTheNextAnimationFrameStillGivesEachSlotOneFrame();
  aBurstOfFramesGoesOneASlotWhereverTheDeadlineIs();
  anUrgentFrameGoesAtOnceButNotTwiceInASlot();
  anUrgentFrameDoesNotJoinAFramePresentedLate();
  aPresentIsDeferredUntilThePreviousWorkIsDone();
  aPresentIsNotDeferredOnceThePreviousWorkIsDone();
  noSlotGetsTwoFramesWhateverTheGpuDoes();
  waitingBeforeSubmitLeavesTheFrameQueued();
  deferringThePresentKeepsAGpuBoundViewAtTheGpusRate();
  deferringThePresentKeepsTheGpuFedThroughALongSubmit();
  withOneFrameInFlightTheNextRecordingWaitsForTheWindow();
  requestsWhileRecordingAreOneRequest();
  withTwoFramesInFlightARecordingThatFinishesEarlyWaitsAndNoneStarts();
  aFrameTheWindowGivesBackIsTheReadyFrameAgain();
  everyFrameRecordedIsShown();
  aRecordingThatFitsKeepsOneFrameInFlight();
  aRecordingLongerThanAFrameOverlapsThePresents();
  oneLateRecordingDoesNotChangeTheFramesInFlight();
  twoLateRecordingsOutOfFourPutTwoFramesInFlightAndASecondOfFitsComesBack();
  aViewDisturbedNowAndThenKeepsTwoFramesInFlight();
  aRecordingThatHoversAroundAFrameDoesNotFlipTheFramesInFlight();
  twoFramesInFlightByPolicyNeverChange();
  aTextureViewTakesAFrameAtOnceWhileItHasNone();
  aTextureViewTakesTheNextFrameOnceItDrewThePrevious();
  anUrgentFrameReplacesTheOneATextureViewHasNotDrawn();
  aFrameWithoutAWindowTextureIsTriedOnTheNextAnimationFrame();
  withoutAWindowFramesAreRecordedAndWait();
  aWindowThatCannotShowAFrameIsLeftAloneUntilItCan();
  anIdleViewAsksForNoAnimationFrames();
  cancelForgetsTheAnimationFrameAndTheFrameInTheWindow();
  aWindowOfAnotherKindHasDrawnNothingYet();
  if (failures == 0) {
    std::printf("FrameSchedulerTest: passed\n");
    return 0;
  }
  std::fprintf(stderr, "FrameSchedulerTest: %d failure(s)\n", failures);
  return 1;
}
