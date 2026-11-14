// Host-side check of rnsurface::FrameScheduler (see run.sh). A simulator
// stands in for everything the scheduler paces: a display that signals each
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
using Window = FrameScheduler::Window;
using Acknowledgement = FrameScheduler::Acknowledgement;
using Depth = FrameScheduler::Depth;
using Take = FrameScheduler::Take;
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

  // The display: a frame every `interval`, and how long after its signal a
  // frame presented still makes it. A CADisplayLink's deadline is just short
  // of the next signal; Android's can be past it.
  Nanos interval = kFrame;
  Nanos deadlineAfterSignal = 900;
  // How long a recording, a submit and the GPU take, per frame.
  Nanos recordTime = 100;
  Nanos submitTime = 50;
  Nanos gpuTime = 0;
  // What the window answers the next takes with, instead of taking the
  // frame; a frame is taken once these run out.
  std::vector<Take> refusals;
  // Whether the window can show a frame: not in the background.
  bool available = true;

  // What happened
  // --------------------------------------------------------------

  Nanos now = 0;
  // When a frame went to the window, when a recording started, and how many
  // frames were recorded.
  std::vector<Nanos> presents;
  std::vector<Nanos> recordingStarts;
  int recorded = 0;
  int frameSignals = 0;
  int holds = 0;
  int acknowledgementPolls = 0;
  // Frames waiting on the target.
  int queued = 0;
  bool held = false;

  // Driving it
  // -----------------------------------------------------------------

  /** The content changes at `time`. */
  void changeContentAt(Nanos time) { post(time, Event::kContentChanged); }

  /**
   The content changes once a frame, `phase` after each frame signal from
   `from` up to `until`: an animation driven from another thread's vsync.
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

  void makeWindowAvailableAt(Nanos time) {
    post(time, Event::kWindowAvailable);
  }

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
    // Slots end at the deadlines.
    return (time - deadlineAfterSignal + 100 * interval) / interval;
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
    state.available = available;
    state.queued = queued > 0;
    state.held = held;
    state.acknowledged = isAcknowledged();
    return state;
  }

private:
  enum class Event {
    kDisplayFrame,
    kContentChanged,
    kRecordingEnded,
    kFrameQueued,
    kClientFrame,
    kUrgentClientFrame,
    kSubmitEnded,
    kAcknowledgementPoll,
    kWindowDraw,
    kWindowAvailable,
  };

  static bool isPresentSide(Event event) {
    return event != Event::kContentChanged && event != Event::kRecordingEnded;
  }

  void post(Nanos time, Event event) { _events.emplace(time, event); }

  bool isAcknowledged() const {
    return scheduler.policy().acknowledgement == Acknowledgement::kNone ||
           now >= _acknowledgedAt;
  }

  void handle(Event event) {
    switch (event) {
    case Event::kDisplayFrame:
      post(now - (now % interval) + interval, Event::kDisplayFrame);
      if (scheduler.wantsFrameSignal()) {
        frameSignals++;
        const Nanos time = now - (now % interval);
        run(scheduler.onFrameSignal(
            {time, interval, time + deadlineAfterSignal}, now, windowState()));
      }
      break;
    case Event::kContentChanged:
      run(scheduler.onRecordingRequested(now));
      break;
    case Event::kRecordingEnded:
      recorded++;
      run(scheduler.onRecordingEnded(now, recordTime, /* produced= */ true));
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
    case Event::kAcknowledgementPoll:
      _pollPosted = false;
      acknowledgementPolls++;
      run(scheduler.onAcknowledgementPoll(now, windowState()));
      break;
    case Event::kWindowDraw:
      run(scheduler.onFrameConsumed(now, windowState()));
      break;
    case Event::kWindowAvailable:
      available = true;
      run(scheduler.onWindowAvailable(now, windowState()));
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
      post(now + recordTime, Event::kRecordingEnded);
    }
    if (actions.requestFrameSignal) {
      expect(scheduler.wantsFrameSignal(),
             "a frame signal asked for is one the scheduler wants");
    }
    if (actions.watchAcknowledgement && !_pollPosted) {
      // The poll that finds the GPU done: how often a host polls until then
      // is the host's business.
      _pollPosted = true;
      post(std::max(now + 1, _acknowledgedAt), Event::kAcknowledgementPoll);
    }
    if (actions.takeFrame) {
      beginSubmit();
    }
    if (actions.presentHeldFrame) {
      expect(held, "only a held frame is presented as one");
      held = false;
      present(_heldWorkDoneAt);
      run(scheduler.onHeldFramePresented(now, windowState()));
    }
  }

  void beginSubmit() {
    if (!refusals.empty()) {
      const Take refusal = refusals.front();
      refusals.erase(refusals.begin());
      run(scheduler.onFrameTaken({refusal, 0}, now, windowState()));
      return;
    }
    if (queued == 0) {
      run(scheduler.onFrameTaken({Take::kNothing, 0}, now, windowState()));
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
    _submitting = true;
    _presentBusyUntil = now + submitTime;
    post(_presentBusyUntil, Event::kSubmitEnded);
  }

  void endSubmit() {
    _submitting = false;
    // The GPU works through what it is handed in order.
    const Nanos workDoneAt = std::max(_gpuFreeAt, now) + gpuTime;
    _gpuFreeAt = workDoneAt;
    if (scheduler.policy().acknowledgement == Acknowledgement::kHoldsPresent &&
        !isAcknowledged()) {
      held = true;
      holds++;
      _heldWorkDoneAt = workDoneAt;
      run(scheduler.onFrameTaken({Take::kHeld, submitTime}, now,
                                 windowState()));
      return;
    }
    present(workDoneAt);
    run(scheduler.onFrameTaken({Take::kPresented, submitTime}, now,
                               windowState()));
  }

  void present(Nanos workDoneAt) {
    presents.push_back(now);
    // The next present waits for the GPU to be done with this frame.
    _acknowledgedAt = workDoneAt;
  }

  std::multimap<Nanos, Event> _events;
  Nanos _presentBusyUntil = 0;
  bool _submitting = false;
  Nanos _gpuFreeAt = 0;
  Nanos _acknowledgedAt = 0;
  Nanos _heldWorkDoneAt = 0;
  int _clientFrames = 0;
  bool _pollPosted = false;
};

constexpr Nanos kFrame = Sim::kFrame;

FrameScheduler::Policy eachFrame(Acknowledgement acknowledgement,
                                 Depth depth = Depth::kAdaptive) {
  return {Window::kShowsEachFrame, acknowledgement, depth};
}

FrameScheduler::Policy latestFrame(Acknowledgement acknowledgement) {
  return {Window::kShowsLatestFrame, acknowledgement, Depth::kAdaptive};
}

// One present per frame of the display ---------------------------------------

void aFrameWithoutAKnownSlotGoesOnTheNextFrameSignal() {
  Sim sim(eachFrame(Acknowledgement::kNone));
  sim.changeContentAt(300);
  sim.runUntil(900);
  expectEqual(sim.recorded, 1, "idle view: the change is recorded at once");
  expectEqual(static_cast<long long>(sim.presents.size()), 0,
              "idle view: nothing is presented before a frame signal");
  sim.runUntil(2 * kFrame);
  expectEqual(static_cast<long long>(sim.presents.size()), 1,
              "idle view: the frame goes on the frame signal");
  expectBetween(sim.presents[0], kFrame, kFrame + 100,
                "idle view: at the signal, not later");
}

void aFrameReadyBeforeTheDeadlineOfAFreeSlotGoesAtOnce() {
  Sim sim(eachFrame(Acknowledgement::kNone));
  sim.changeContentAt(300);
  sim.runUntil(2 * kFrame + 50);
  // The view was active: its frame signals keep coming for now, and the
  // slot of the frame that starts at 2000 has no frame yet.
  sim.changeContentAt(2 * kFrame + 200);
  sim.runUntil(3 * kFrame - 1);
  expectEqual(static_cast<long long>(sim.presents.size()), 2,
              "free slot: the frame does not wait for the next signal");
  expectBetween(sim.presents[1], 2 * kFrame + 300, 2 * kFrame + 400,
                "free slot: presented as soon as it is submitted");
}

void aSlotGetsOneFrame() {
  Sim sim(eachFrame(Acknowledgement::kNone));
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
  Sim sim(eachFrame(Acknowledgement::kNone));
  sim.changeContentAt(300);
  sim.runUntil(2 * kFrame + 50);
  // Ready 50 before the next signal, past the deadline (100 before it).
  sim.recordTime = 700;
  sim.changeContentAt(2 * kFrame + 250);
  sim.runUntil(3 * kFrame - 1);
  expectEqual(static_cast<long long>(sim.presents.size()), 1,
              "missed deadline: the frame does not go late");
  sim.runUntil(4 * kFrame - 1);
  expectEqual(static_cast<long long>(sim.presents.size()), 2,
              "missed deadline: it goes on the next frame signal");
  expectBetween(sim.presents[1], 3 * kFrame, 3 * kFrame + 100,
                "missed deadline: at the signal");
  expect(!sim.scheduler.isDeep(), "missed deadline: the depth does not change");
}

void aSubmitThatWouldMissTheDeadlineWaitsForTheSignal() {
  // The same frame, ready 400 or 200 before the deadline, with a submit that
  // takes 300.
  const auto presentedAt = [](Nanos recordTime) {
    Sim sim(eachFrame(Acknowledgement::kNone));
    sim.submitTime = 300;
    sim.animate(0, 5 * kFrame, 100);
    // The last of these frames goes at 5000, and the signal at 6000 finds
    // the view idle: its slot, which ends at 6900, has no frame.
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
                "signal");
}

void aSlowSubmitNeverStarvesTheWindow() {
  Sim sim(eachFrame(Acknowledgement::kNone));
  // A submit longer than a frame: no frame could ever make a deadline.
  sim.submitTime = 1300;
  sim.animate(0, 30 * kFrame, 100);
  sim.runUntil(32 * kFrame);
  // 26 frames of the display, a submit every 1.3 of them.
  expectBetween(sim.presentsBetween(4 * kFrame, 30 * kFrame), 19, 20,
                "slow submit: the rate the submit allows, not none");
}

void aLongSubmitTakesAFrameOnEachSignalWhereverTheDeadlineIs() {
  // A submit of most of a frame ends in the slot after the one it started
  // in when the deadline falls in the middle of the frame: the next frame
  // still goes on the next signal, into a slot of its own.
  for (Nanos deadline : {900, 1500, 2300}) {
    Sim sim(eachFrame(Acknowledgement::kNone, Depth::kTwo));
    sim.deadlineAfterSignal = deadline;
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
  Sim sim(eachFrame(Acknowledgement::kNone));
  sim.queueClientFrameAt(100);
  sim.queueClientFrameAt(110);
  sim.queueClientFrameAt(120);
  sim.runUntil(5 * kFrame);
  expectEqual(static_cast<long long>(sim.presents.size()), 3,
              "client frames: all of them are shown");
  expectEqual(sim.mostPresentsInASlot(), 1, "client frames: one per frame");
  expectBetween(sim.presents[2], 3 * kFrame, 3 * kFrame + 100,
                "client frames: on three signals in a row");
}

void aDeadlinePastTheNextSignalStillGivesEachSlotOneFrame() {
  // Android's frame timeline: a frame can be presented until a third of a
  // frame past the next signal and still make it.
  Sim sim(eachFrame(Acknowledgement::kNone));
  sim.deadlineAfterSignal = 1300;
  sim.animate(0, 40 * kFrame, 100);
  sim.runUntil(42 * kFrame);
  expectEqual(sim.mostPresentsInASlot(), 1,
              "late deadline: no slot of the compositor gets two frames");
  expectBetween(sim.presentsBetween(4 * kFrame, 40 * kFrame), 35, 36,
                "late deadline: a frame each");
}

void aBurstOfFramesGoesOneASlotWhereverTheDeadlineIs() {
  // From a CADisplayLink's deadline, short of the next signal, to a frame
  // timeline's, up to three frames past its signal.
  for (Nanos deadline : {900, 1000, 1300, 2000, 2300, 3100}) {
    Sim sim(eachFrame(Acknowledgement::kNone));
    sim.deadlineAfterSignal = deadline;
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
  Sim sim(eachFrame(Acknowledgement::kNone));
  // A first frame, so that the view knows the display's frames; then it is
  // idle, and no frame signal comes.
  sim.changeContentAt(300);
  sim.runUntil(3 * kFrame + 900);
  expectEqual(static_cast<long long>(sim.presents.size()), 1,
              "urgent: a first frame was shown");
  // Past the deadline at 3900, with no frame signal to say so.
  sim.queueClientFrameAt(3 * kFrame + 950, /* urgent= */ true);
  sim.runUntil(4 * kFrame + 10);
  expectEqual(static_cast<long long>(sim.presents.size()), 2,
              "urgent: goes at once, without a frame signal");
  sim.queueClientFrameAt(4 * kFrame + 50, /* urgent= */ true);
  sim.runUntil(5 * kFrame - 1);
  expectEqual(static_cast<long long>(sim.presents.size()), 2,
              "urgent: the slot has its frame, the second waits");
  sim.runUntil(5 * kFrame + 100);
  expectEqual(static_cast<long long>(sim.presents.size()), 3,
              "urgent: the second goes on the next frame signal");
  expectEqual(sim.mostPresentsInASlot(), 1, "urgent: one frame per slot");
}

// No present without an acknowledgement --------------------------------------

void aFrameIsHeldUntilTheGpuIsDoneWithTheOneBefore() {
  Sim sim(eachFrame(Acknowledgement::kHoldsPresent));
  // The GPU takes a frame and a half per frame.
  sim.gpuTime = 1500;
  sim.queueClientFrameAt(100);
  sim.queueClientFrameAt(110);
  sim.queueClientFrameAt(120);
  sim.runUntil(2 * kFrame + 100);
  // The first went on the signal at 1000 (submitted by 1050, done by 2550);
  // the second was submitted on the signal at 2000 and is held.
  expectEqual(static_cast<long long>(sim.presents.size()), 1,
              "hold: the second frame is not presented yet");
  expect(sim.held, "hold: its work is submitted, its present held");
  expectEqual(sim.queued, 1,
              "hold: the window takes no other frame while it holds one");
  sim.runUntil(3 * kFrame - 1);
  expectEqual(static_cast<long long>(sim.presents.size()), 2,
              "hold: the acknowledgement releases it");
  expectBetween(sim.presents[1], 2550, 2560,
                "hold: when the GPU is done, not on a frame signal");
  expectEqual(sim.queued, 1,
              "hold: the third waits for a frame signal, as any frame");
  sim.runUntil(8 * kFrame);
  expectEqual(static_cast<long long>(sim.presents.size()), 3,
              "hold: every frame is shown in the end");
}

void anAcknowledgedFrameIsNotHeld() {
  Sim sim(eachFrame(Acknowledgement::kHoldsPresent));
  sim.gpuTime = 300;
  sim.animate(0, 20 * kFrame, 100);
  sim.runUntil(22 * kFrame);
  expectEqual(sim.holds, 0, "light scene: nothing is ever held");
  expectEqual(sim.acknowledgementPolls, 0,
              "light scene: the acknowledgement is never polled for");
}

void aDecliningWindowLeavesTheFrameQueued() {
  Sim sim(eachFrame(Acknowledgement::kDeclinesFrame));
  sim.gpuTime = 1500;
  sim.queueClientFrameAt(100);
  sim.queueClientFrameAt(110);
  sim.runUntil(2 * kFrame + 100);
  expectEqual(static_cast<long long>(sim.presents.size()), 1,
              "decline: the second frame is not presented yet");
  expect(!sim.held, "decline: nothing is held");
  expectEqual(sim.queued, 1, "decline: it stays queued");
  sim.runUntil(3 * kFrame - 1);
  expectEqual(static_cast<long long>(sim.presents.size()), 2,
              "decline: it goes once the GPU is done");
  expectBetween(sim.presents[1], 2600, 2610,
                "decline: its submit starts at the acknowledgement");
}

void holdingKeepsAGpuBoundViewAtTheGpusRate() {
  // The GPU takes a frame and a fifth per frame, a submit a fifth of one.
  const auto frames = [](Acknowledgement acknowledgement) {
    Sim sim(eachFrame(acknowledgement, Depth::kTwo));
    sim.gpuTime = 1200;
    sim.submitTime = 200;
    sim.animate(0, 200 * kFrame, 100);
    sim.runUntil(200 * kFrame);
    expectEqual(sim.mostPresentsInASlot(), 1,
                "GPU-bound: no slot gets two frames");
    return sim.presentsBetween(20 * kFrame, 200 * kFrame);
  };
  // 180 frames of the display: the GPU can do 150 frames in that time.
  const int held = frames(Acknowledgement::kHoldsPresent);
  const int declined = frames(Acknowledgement::kDeclinesFrame);
  expectBetween(held, 146, 151, "hold: the GPU never idles");
  expectBetween(declined, 110, 131,
                "decline: the GPU idles while the next frame is submitted");
  expect(held > declined, "hold presents more frames than decline");
}

void holdingKeepsTheGpuFedThroughALongSubmit() {
  // The Samsung's heaviest scene: a submit of most of a frame, a GPU that
  // takes 1.7 frames, a deadline in the middle of the frame.
  for (Nanos deadline : {900, 1500, 2300}) {
    Sim sim(eachFrame(Acknowledgement::kHoldsPresent, Depth::kTwo));
    sim.deadlineAfterSignal = deadline;
    sim.gpuTime = 1700;
    sim.submitTime = 850;
    sim.recordTime = 1300;
    sim.animate(0, 400 * kFrame, 100);
    sim.runUntil(400 * kFrame);
    // 360 frames of the display: the GPU can do 211 frames in that time.
    expectBetween(sim.presentsBetween(40 * kFrame, 400 * kFrame), 207, 212,
                  "hold, long submit: the GPU never idles");
    expectEqual(sim.mostPresentsInASlot(), 1,
                "hold, long submit: one frame a slot");
  }
}

// A bounded pipeline ---------------------------------------------------------

void holdingOneFrameTheNextRecordingWaitsForTheWindow() {
  Sim sim(eachFrame(Acknowledgement::kNone));
  sim.changeContentAt(100);
  sim.changeContentAt(400);
  sim.runUntil(900);
  expectEqual(static_cast<long long>(sim.recordingStarts.size()), 1,
              "one frame deep: no recording while the ready frame waits");
  sim.runUntil(2 * kFrame);
  expectEqual(static_cast<long long>(sim.recordingStarts.size()), 2,
              "one frame deep: the next starts once the window took it");
  expectBetween(sim.recordingStarts[1], kFrame, kFrame + 10,
                "one frame deep: as its submit starts, not after it");
}

void requestsWhileRecordingAreOneRequest() {
  Sim sim(eachFrame(Acknowledgement::kNone));
  sim.recordTime = 300;
  for (Nanos time = 100; time < 400; time += 10) {
    sim.changeContentAt(time);
  }
  sim.runUntil(3 * kFrame);
  expectEqual(sim.recorded, 2,
              "coalescing: one recording in flight, one for all the rest");
}

void twoFramesDeepARecordingThatEndsEarlyWaitsAndNoneStarts() {
  Sim sim(eachFrame(Acknowledgement::kNone, Depth::kTwo));
  // No window takes anything before the first frame signal at 1000.
  for (Nanos time = 100; time < 900; time += 50) {
    sim.changeContentAt(time);
  }
  sim.runUntil(900);
  expectEqual(sim.recorded, 2, "two frames deep: one ready, one behind it");
  expectEqual(sim.queued, 1, "two frames deep: one frame on the target");
  expect(sim.scheduler.hasWaitingRecording(),
         "two frames deep: the second waits for the ready slot");
  expectEqual(static_cast<long long>(sim.recordingStarts.size()), 2,
              "two frames deep: no third recording starts");
  sim.runUntil(kFrame + 300);
  expectEqual(sim.queued, 1,
              "two frames deep: the one that waited is ready once the first "
              "is taken");
  expectEqual(static_cast<long long>(sim.recordingStarts.size()), 3,
              "two frames deep: and the next recording starts");
}

void aFrameTheWindowGivesBackIsTheReadyFrameAgain() {
  FrameScheduler scheduler(eachFrame(Acknowledgement::kNone));
  expect(scheduler.onRecordingRequested(100).startRecording,
         "given back: a first recording starts");
  expect(scheduler.onRecordingEnded(200, 100, true).queueRecording,
         "given back: it is the ready frame");
  // The window takes it, the next recording starts, and the window then has
  // no drawable for it after all.
  scheduler.onRecordingRequested(250);
  expect(scheduler.onReadyFrameTaken(300).startRecording,
         "given back: the next recording starts as the window takes it");
  scheduler.onReadyFrameReturned();
  expect(scheduler.hasReadyFrame(), "given back: the frame is ready again");
  expect(!scheduler.onRecordingEnded(400, 100, true).queueRecording,
         "given back: the recording that ended meanwhile waits behind it");
  expect(scheduler.hasWaitingRecording(), "given back: one waits");
  expect(scheduler.onReadyFrameTaken(500).queueRecording,
         "given back: and is ready once the window took the first");
}

void everyFrameRecordedIsShown() {
  for (Depth depth : {Depth::kAdaptive, Depth::kTwo}) {
    for (Nanos recordTime : {100, 600, 900, 1300, 2700}) {
      Sim sim(eachFrame(Acknowledgement::kHoldsPresent, depth));
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

// Depth follows the measured time --------------------------------------------

void aRecordingThatFitsKeepsTheViewOneFrameDeep() {
  Sim sim(eachFrame(Acknowledgement::kNone));
  sim.recordTime = 300;
  sim.animate(0, 100 * kFrame, 100);
  sim.runUntil(102 * kFrame);
  expect(!sim.scheduler.isDeep(), "fits: one frame deep");
  expectBetween(sim.presentsBetween(4 * kFrame, 100 * kFrame), 95, 96,
                "fits: a frame each");
}

void aRecordingLongerThanAFrameOverlapsThePresents() {
  // 120 Hz, a recording of 10 ms: a frame is 8333 units here.
  Sim sim(eachFrame(Acknowledgement::kNone));
  sim.interval = 8333;
  sim.deadlineAfterSignal = 7500;
  sim.recordTime = 10000;
  sim.submitTime = 300;
  sim.animate(0, 1200 * 8333, 800);
  sim.runUntil(1200 * 8333);
  expect(sim.scheduler.isDeep(), "long recording: two frames deep");
  // 1000 frames of the display, 8.333 s: a recording every 10 ms is 833
  // frames, where a recording that waited for each present would show 500.
  expectBetween(sim.presentsBetween(200 * 8333, 1200 * 8333), 820, 834,
                "long recording: the rate the recording allows");
}

void oneLateRecordingDoesNotChangeTheDepth() {
  Sim sim(eachFrame(Acknowledgement::kNone));
  sim.animate(0, 12 * kFrame, 100);
  sim.runUntil(5 * kFrame + 50);
  sim.recordTime = 950;
  sim.runUntil(6 * kFrame + 50);
  sim.recordTime = 100;
  sim.runUntil(14 * kFrame);
  expect(!sim.scheduler.isDeep(), "one spike: still one frame deep");
}

void twoLateRecordingsOutOfFourGoDeeperAndASecondOfFitsComesBack() {
  Sim sim(eachFrame(Acknowledgement::kNone));
  sim.recordTime = 950;
  sim.animate(0, 200 * kFrame, 100);
  sim.runUntil(6 * kFrame);
  expect(sim.scheduler.isDeep(), "late recordings: two frames deep");
  sim.recordTime = 100;
  sim.runUntil(6 * kFrame + (FrameScheduler::kFramesToGoShallow - 5) * kFrame);
  expect(sim.scheduler.isDeep(),
         "hysteresis: not back before recordings fit for long enough");
  sim.runUntil(6 * kFrame + (FrameScheduler::kFramesToGoShallow + 5) * kFrame);
  expect(!sim.scheduler.isDeep(),
         "hysteresis: back once they have for about a second");
}

void aViewDisturbedNowAndThenStaysTwoFramesDeep() {
  Sim sim(eachFrame(Acknowledgement::kNone));
  sim.animate(0, 400 * kFrame, 100);
  int changes = 0;
  bool deep = false;
  for (Nanos frame = 0; frame < 400; frame++) {
    // Two late recordings every forty frames: three times a second at
    // 120 Hz.
    sim.recordTime = frame % 40 < 2 ? 950 : 100;
    sim.runUntil(frame * kFrame + 50);
    if (sim.scheduler.isDeep() != deep) {
      deep = !deep;
      changes++;
    }
  }
  expectEqual(changes, 1,
              "disturbed: the depth changes once, not at each disturbance");
  expect(sim.scheduler.isDeep(), "disturbed: two frames deep");
}

void aRecordingThatHoversAroundAFrameDoesNotFlipTheDepth() {
  Sim sim(eachFrame(Acknowledgement::kNone));
  sim.animate(0, 200 * kFrame, 100);
  int switches = 0;
  bool deep = false;
  for (Nanos frame = 0; frame < 200; frame++) {
    // Between 70% and 100% of a frame, back and forth.
    sim.recordTime = 700 + (frame % 4) * 100;
    sim.runUntil(frame * kFrame + 50);
    if (sim.scheduler.isDeep() != deep) {
      deep = !deep;
      switches++;
    }
  }
  expectEqual(switches, 1, "hovering: the depth settles, it does not flip");
}

void aFixedDepthOfTwoNeverChanges() {
  Sim sim(eachFrame(Acknowledgement::kNone, Depth::kTwo));
  sim.animate(0, 60 * kFrame, 100);
  sim.runUntil(62 * kFrame);
  expect(sim.scheduler.isDeep(), "fixed depth: two frames deep throughout");
}

// A window that shows the latest frame ---------------------------------------

void aTextureViewTakesAFrameAtOnceWhileItHasNone() {
  Sim sim(latestFrame(Acknowledgement::kNone));
  sim.changeContentAt(300);
  sim.runUntil(600);
  expectEqual(static_cast<long long>(sim.presents.size()), 1,
              "latest frame: presented without a frame signal");
}

void aTextureViewTakesTheNextFrameOnceItDrewThePrevious() {
  Sim sim(latestFrame(Acknowledgement::kNone));
  sim.queueClientFrameAt(100);
  sim.queueClientFrameAt(110);
  sim.runUntil(5 * kFrame);
  expectEqual(static_cast<long long>(sim.presents.size()), 1,
              "latest frame: one at a time, whatever signals pass");
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
  Sim sim(latestFrame(Acknowledgement::kNone));
  sim.queueClientFrameAt(100);
  sim.queueClientFrameAt(300, /* urgent= */ true);
  sim.runUntil(600);
  expectEqual(static_cast<long long>(sim.presents.size()), 2,
              "latest frame: a frame for a resized window does not wait for "
              "the draw");
}

void aFrameTheWindowDeclinesIsTriedOnTheNextFrameSignal() {
  for (Window window : {Window::kShowsEachFrame, Window::kShowsLatestFrame}) {
    Sim sim({window, Acknowledgement::kNone, Depth::kAdaptive});
    sim.queueClientFrameAt(100);
    sim.runUntil(kFrame + 100);
    const auto presentsSoFar = sim.presents.size();
    sim.consumeAt(kFrame + 150);
    // No drawable for the next frame.
    sim.refusals.push_back(Take::kDeclined);
    sim.queueClientFrameAt(window == Window::kShowsEachFrame ? 2 * kFrame - 50
                                                             : kFrame + 200);
    sim.runUntil(2 * kFrame - 1);
    if (window == Window::kShowsLatestFrame) {
      expectEqual(static_cast<long long>(sim.presents.size()),
                  static_cast<long long>(presentsSoFar),
                  "declined: not tried again before a frame signal");
    }
    sim.runUntil(4 * kFrame);
    expectEqual(static_cast<long long>(sim.presents.size()),
                static_cast<long long>(presentsSoFar) + 1,
                "declined: tried again on a frame signal");
  }
}

// The window comes and goes --------------------------------------------------

void withoutAWindowFramesAreRecordedAndWait() {
  Sim sim({Window::kNone, Acknowledgement::kNone, Depth::kAdaptive});
  sim.animate(0, 10 * kFrame, 100);
  sim.runUntil(12 * kFrame);
  expectEqual(sim.recorded, 1, "no window: one frame is recorded, and waits");
  expectEqual(sim.frameSignals, 0, "no window: no frame signal is asked for");
  expectEqual(static_cast<long long>(sim.presents.size()), 0,
              "no window: nothing is presented");
}

void aWindowThatCannotShowAFrameIsLeftAloneUntilItCan() {
  Sim sim(eachFrame(Acknowledgement::kNone));
  // The app is in the background.
  sim.available = false;
  sim.queueClientFrameAt(100);
  sim.animate(0, 10 * kFrame, 100);
  sim.runUntil(10 * kFrame);
  expectEqual(static_cast<long long>(sim.presents.size()), 0,
              "unavailable: nothing is presented");
  expectEqual(sim.frameSignals, 0,
              "unavailable: no frame signal is asked for meanwhile");
  expectEqual(sim.recorded, 1, "unavailable: one frame is recorded, and waits");
  sim.makeWindowAvailableAt(10 * kFrame + 100);
  sim.runUntil(14 * kFrame);
  // The client's frame, the frame that waited, and one more for everything
  // that changed meanwhile.
  expectEqual(static_cast<long long>(sim.presents.size()), 3,
              "unavailable: the frames go once the window can show them");
  expectEqual(sim.recorded, 2,
              "unavailable: what changed meanwhile is one recording");
}

void anIdleViewAsksForNoFrameSignals() {
  Sim sim(eachFrame(Acknowledgement::kNone));
  sim.animate(0, 10 * kFrame, 100);
  sim.runUntil(40 * kFrame);
  // A signal per frame presented, and one after the last to find the view
  // idle: a display link pauses then.
  expectBetween(sim.frameSignals, 10, 12,
                "idle: the frame signals stop with the frames");
  expect(!sim.scheduler.wantsFrameSignal(),
         "idle: a display link is told it may pause");
}

void cancelForgetsTheSignalAndTheFrameInTheWindow() {
  FrameScheduler scheduler(latestFrame(Acknowledgement::kNone));
  FrameScheduler::WindowState window;
  window.queued = true;
  expect(scheduler.onFrameQueued(100, window, false).takeFrame,
         "cancel: a first frame goes to the window");
  auto actions = scheduler.onFrameTaken({Take::kPresented, 10}, 110, window);
  expect(!actions.takeFrame, "cancel: the second waits for the draw");
  expect(scheduler.wantsFrameSignal(), "cancel: a frame signal is asked for");
  scheduler.cancel();
  expect(!scheduler.wantsFrameSignal(), "cancel: the signal is forgotten");
  expect(scheduler.onFrameQueued(200, window, false).takeFrame,
         "cancel: so is the frame the window had");
}

void aWindowOfAnotherKindHasDrawnNothingYet() {
  FrameScheduler scheduler(latestFrame(Acknowledgement::kNone));
  FrameScheduler::WindowState window;
  window.queued = true;
  scheduler.onFrameQueued(100, window, false);
  scheduler.onFrameTaken({Take::kPresented, 10}, 110, window);
  scheduler.setWindow(Window::kShowsEachFrame);
  scheduler.setWindow(Window::kShowsLatestFrame);
  expect(scheduler.onFrameQueued(200, window, false).takeFrame,
         "new window: it takes a frame at once");
}

} // namespace

int main() {
  aFrameWithoutAKnownSlotGoesOnTheNextFrameSignal();
  aFrameReadyBeforeTheDeadlineOfAFreeSlotGoesAtOnce();
  aSlotGetsOneFrame();
  aMissedDeadlineSkipsTheFrame();
  aSubmitThatWouldMissTheDeadlineWaitsForTheSignal();
  aSlowSubmitNeverStarvesTheWindow();
  aLongSubmitTakesAFrameOnEachSignalWhereverTheDeadlineIs();
  clientsFramesGoOneAFrame();
  aDeadlinePastTheNextSignalStillGivesEachSlotOneFrame();
  aBurstOfFramesGoesOneASlotWhereverTheDeadlineIs();
  anUrgentFrameGoesAtOnceButNotTwiceInASlot();
  aFrameIsHeldUntilTheGpuIsDoneWithTheOneBefore();
  anAcknowledgedFrameIsNotHeld();
  aDecliningWindowLeavesTheFrameQueued();
  holdingKeepsAGpuBoundViewAtTheGpusRate();
  holdingKeepsTheGpuFedThroughALongSubmit();
  holdingOneFrameTheNextRecordingWaitsForTheWindow();
  requestsWhileRecordingAreOneRequest();
  twoFramesDeepARecordingThatEndsEarlyWaitsAndNoneStarts();
  aFrameTheWindowGivesBackIsTheReadyFrameAgain();
  everyFrameRecordedIsShown();
  aRecordingThatFitsKeepsTheViewOneFrameDeep();
  aRecordingLongerThanAFrameOverlapsThePresents();
  oneLateRecordingDoesNotChangeTheDepth();
  twoLateRecordingsOutOfFourGoDeeperAndASecondOfFitsComesBack();
  aViewDisturbedNowAndThenStaysTwoFramesDeep();
  aRecordingThatHoversAroundAFrameDoesNotFlipTheDepth();
  aFixedDepthOfTwoNeverChanges();
  aTextureViewTakesAFrameAtOnceWhileItHasNone();
  aTextureViewTakesTheNextFrameOnceItDrewThePrevious();
  anUrgentFrameReplacesTheOneATextureViewHasNotDrawn();
  aFrameTheWindowDeclinesIsTriedOnTheNextFrameSignal();
  withoutAWindowFramesAreRecordedAndWait();
  aWindowThatCannotShowAFrameIsLeftAloneUntilItCan();
  anIdleViewAsksForNoFrameSignals();
  cancelForgetsTheSignalAndTheFrameInTheWindow();
  aWindowOfAnotherKindHasDrawnNothingYet();
  if (failures == 0) {
    std::printf("FrameSchedulerTest: passed\n");
    return 0;
  }
  std::fprintf(stderr, "FrameSchedulerTest: %d failure(s)\n", failures);
  return 1;
}
