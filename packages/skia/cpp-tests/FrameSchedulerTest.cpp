// Host-side check of rnsurface::FrameScheduler (see run.sh): the cases of
// the Java FrameSchedulerTest it replaced, with a host that records what the
// scheduler asks of it. A window that shows each frame stands in for a
// SurfaceView (and a CAMetalLayer), one that shows the latest frame for a
// TextureView: there, a present replays the frame and holds it, and the
// hand-over to the window is a call of its own (kPresentHeld).

#include <cstdio>
#include <deque>
#include <vector>

#include "rnsurface/FrameScheduler.h"

namespace {

using rnsurface::FrameScheduler;
using Window = FrameScheduler::Window;

enum class Call { kPostFrameCallback, kPresent, kPresentHeld };

constexpr int kPresented = FrameScheduler::kPresented;
constexpr int kMoreQueued = FrameScheduler::kMoreQueued;

class RecordingHost : public FrameScheduler::Host {
public:
  std::vector<Call> calls;
  // What the next presents report; kPresented once these run out.
  std::deque<int> results;
  // What the next hand-overs report; a frame went to the window once these
  // run out.
  std::deque<bool> heldResults;

  void postFrameCallback() override {
    calls.push_back(Call::kPostFrameCallback);
  }

  int presentFrame() override {
    calls.push_back(Call::kPresent);
    if (results.empty()) {
      return kPresented;
    }
    const int result = results.front();
    results.pop_front();
    return result;
  }

  bool presentHeldFrame() override {
    calls.push_back(Call::kPresentHeld);
    if (heldResults.empty()) {
      return true;
    }
    const bool result = heldResults.front();
    heldResults.pop_front();
    return result;
  }

  std::vector<Call> takeCalls() {
    auto taken = calls;
    calls.clear();
    return taken;
  }
};

int failures = 0;

void expectCalls(RecordingHost &host, std::vector<Call> expected,
                 const char *what) {
  const auto actual = host.takeCalls();
  if (actual != expected) {
    std::fprintf(stderr, "FAIL: %s: expected %zu call(s), got %zu\n", what,
                 expected.size(), actual.size());
    failures++;
  }
}

// Each case starts with a scheduler of its own, as each Java test did.
struct Case {
  RecordingHost host;
  FrameScheduler scheduler{host};
  explicit Case(Window window) { scheduler.setWindow(window); }
};

void surfaceViewFrameIsPresentedOnTheNextVsync() {
  Case c(Window::kShowsEachFrame);
  c.scheduler.requestFrame();
  expectCalls(c.host, {Call::kPostFrameCallback}, "each-frame: request posts");
  c.scheduler.onFrame();
  expectCalls(c.host, {Call::kPresent}, "each-frame: the vsync presents");
}

void surfaceViewNeverHandsOverAHeldFrame() {
  Case c(Window::kShowsEachFrame);
  c.scheduler.requestFrame();
  c.scheduler.onFrame();
  c.scheduler.onFrameConsumed();
  expectCalls(c.host, {Call::kPostFrameCallback, Call::kPresent},
              "each-frame: the present is the hand-over");
}

void textureViewFrameIsHandedOverOnTheSpotWhileTheWindowHasNone() {
  Case c(Window::kShowsLatestFrame);
  c.scheduler.requestFrame();
  expectCalls(c.host, {Call::kPresent, Call::kPresentHeld},
              "latest-frame: replayed and handed over on the spot");
}

void textureViewNextFrameIsReplayedAtOnceAndHandedOverOnceTheWindowDrew() {
  Case c(Window::kShowsLatestFrame);
  c.scheduler.requestFrame();
  expectCalls(c.host, {Call::kPresent, Call::kPresentHeld},
              "latest-frame: the first goes to the window");
  // The window has not drawn: the next frame is replayed now, not handed
  // over.
  c.scheduler.requestFrame();
  expectCalls(c.host, {Call::kPresent}, "latest-frame: the next is held");
  // One frame is held at a time: the one after waits.
  c.scheduler.requestFrame();
  expectCalls(c.host, {}, "latest-frame: a third waits for the draw");
  // The draw hands over the held frame and replays the waiting one behind it.
  c.scheduler.onFrameConsumed();
  expectCalls(c.host, {Call::kPresentHeld, Call::kPresent},
              "latest-frame: handed over once drawn, the next replayed");
  c.scheduler.onFrameConsumed();
  expectCalls(c.host, {Call::kPresentHeld},
              "latest-frame: the last one handed over");
  // Nothing was requested since: the window's next draw presents nothing.
  c.scheduler.onFrameConsumed();
  expectCalls(c.host, {}, "latest-frame: nothing requested, nothing presented");
  // The window drew everything it was given: the next request goes straight
  // to it again.
  c.scheduler.requestFrame();
  expectCalls(c.host, {Call::kPresent, Call::kPresentHeld},
              "latest-frame: on the spot again once the window is idle");
}

void textureViewLeftoverIsReplayedAtOnceAndHandedOverOnceTheWindowDrew() {
  Case c(Window::kShowsLatestFrame);
  c.host.results.push_back(kPresented | kMoreQueued);
  c.scheduler.requestFrame();
  // The first frame went to the window; the leftover is replayed right
  // behind it and held.
  expectCalls(c.host, {Call::kPresent, Call::kPresentHeld, Call::kPresent},
              "latest-frame leftover: replayed behind the first");
  c.scheduler.onFrameConsumed();
  expectCalls(c.host, {Call::kPresentHeld},
              "latest-frame leftover: handed over once drawn");
}

void textureViewLeftoverBehindAHeldFrameWaits() {
  Case c(Window::kShowsLatestFrame);
  c.scheduler.requestFrame();
  expectCalls(c.host, {Call::kPresent, Call::kPresentHeld},
              "latest-frame held leftover: the first goes to the window");
  c.host.results.push_back(kPresented | kMoreQueued);
  c.scheduler.requestFrame();
  expectCalls(c.host, {Call::kPresent},
              "latest-frame held leftover: the next is held, the rest waits");
  c.scheduler.onFrameConsumed();
  expectCalls(c.host, {Call::kPresentHeld, Call::kPresent},
              "latest-frame held leftover: handed over, the rest replayed");
}

void textureViewFrameTheWindowCouldNotTakeIsTriedOnTheNextVsync() {
  Case c(Window::kShowsLatestFrame);
  c.host.results.push_back(kMoreQueued);
  c.scheduler.requestFrame();
  expectCalls(c.host, {Call::kPresent, Call::kPostFrameCallback},
              "latest-frame declined: retried on the vsync");
  // Requests meanwhile wait for that vsync.
  c.scheduler.requestFrame();
  expectCalls(c.host, {},
              "latest-frame declined: a request waits for the vsync");
  c.scheduler.onFrame();
  expectCalls(c.host, {Call::kPresent, Call::kPresentHeld},
              "latest-frame declined: the vsync presents");
}

void textureViewHeldFrameTheWindowDidNotGetLeavesItIdle() {
  // The hand-over found nothing to hand over (the window took the frame
  // already, or went): the window has no frame of the scheduler's to draw,
  // so the next request goes to it on the spot.
  Case c(Window::kShowsLatestFrame);
  c.scheduler.requestFrame();
  c.scheduler.requestFrame();
  expectCalls(c.host, {Call::kPresent, Call::kPresentHeld, Call::kPresent},
              "latest-frame not handed over: one held");
  c.host.heldResults.push_back(false);
  c.scheduler.onFrameConsumed();
  expectCalls(c.host, {Call::kPresentHeld},
              "latest-frame not handed over: asked");
  c.scheduler.requestFrame();
  expectCalls(c.host, {Call::kPresent, Call::kPresentHeld},
              "latest-frame not handed over: the next goes on the spot");
}

void surfaceViewLeftoverIsPresentedOnTheNextVsync() {
  Case c(Window::kShowsEachFrame);
  c.host.results.push_back(kPresented | kMoreQueued);
  c.scheduler.requestFrame();
  c.scheduler.onFrame();
  expectCalls(
      c.host,
      {Call::kPostFrameCallback, Call::kPresent, Call::kPostFrameCallback},
      "each-frame leftover: posted again");
  c.scheduler.onFrame();
  expectCalls(c.host, {Call::kPresent},
              "each-frame leftover: the next vsync presents");
}

void frameForAResizedWindowIsPresentedOnTheSpot() {
  {
    Case c(Window::kShowsEachFrame);
    c.scheduler.requestFrame(/* forResizedWindow= */ true);
    expectCalls(c.host, {Call::kPresent},
                "resized: each-frame presents on the spot");
  }
  {
    // Also while the latest-frame window has a frame it has not drawn, and
    // one held for it: the resized frame is handed over ahead of both.
    Case c(Window::kShowsLatestFrame);
    c.scheduler.requestFrame();
    c.scheduler.requestFrame();
    expectCalls(c.host, {Call::kPresent, Call::kPresentHeld, Call::kPresent},
                "resized: latest-frame has one in the window, one held");
    c.scheduler.requestFrame(/* forResizedWindow= */ true);
    expectCalls(c.host, {Call::kPresent, Call::kPresentHeld},
                "resized: latest-frame hands over on the spot");
    // Nothing is held any more: the next request is held behind the frame
    // handed over, and the draw hands it over.
    c.scheduler.requestFrame();
    expectCalls(c.host, {Call::kPresent}, "resized: the next is held");
    c.scheduler.onFrameConsumed();
    expectCalls(c.host, {Call::kPresentHeld},
                "resized: handed over once drawn");
  }
}

void leftoverOfAFrameForAResizedWindowWaitsLikeAnyOther() {
  {
    Case c(Window::kShowsEachFrame);
    c.host.results.push_back(kPresented | kMoreQueued);
    c.scheduler.requestFrame(/* forResizedWindow= */ true);
    expectCalls(c.host, {Call::kPresent, Call::kPostFrameCallback},
                "resized leftover: each-frame posts");
  }
  {
    Case c(Window::kShowsLatestFrame);
    c.host.results.push_back(kPresented | kMoreQueued);
    c.scheduler.requestFrame(/* forResizedWindow= */ true);
    expectCalls(c.host, {Call::kPresent, Call::kPresentHeld, Call::kPresent},
                "resized leftover: latest-frame replays it behind, held");
    c.scheduler.onFrameConsumed();
    expectCalls(c.host, {Call::kPresentHeld},
                "resized leftover: handed over once drawn");
  }
}

void requestsWaitingForTheSameFrameArePostedOnce() {
  Case c(Window::kShowsEachFrame);
  c.scheduler.requestFrame();
  c.scheduler.requestFrame();
  c.scheduler.onFrame();
  expectCalls(c.host, {Call::kPostFrameCallback, Call::kPresent},
              "two requests, one callback");
}

void requestAfterTheFrameRanIsPostedAgain() {
  Case c(Window::kShowsEachFrame);
  c.scheduler.requestFrame();
  c.scheduler.onFrame();
  c.scheduler.requestFrame();
  c.scheduler.onFrame();
  expectCalls(c.host,
              {Call::kPostFrameCallback, Call::kPresent,
               Call::kPostFrameCallback, Call::kPresent},
              "a request after the frame posts again");
}

void withoutABackingViewNothingIsPostedOrPresented() {
  Case c(Window::kNone);
  c.scheduler.requestFrame();
  c.scheduler.requestFrame(/* forResizedWindow= */ true);
  c.scheduler.onFrame();
  c.scheduler.onFrameConsumed();
  expectCalls(c.host, {}, "no window: nothing happens");
}

void cancelDropsOutstandingRequestsAndTheFramesInAndForTheWindow() {
  {
    Case c(Window::kShowsEachFrame);
    c.scheduler.requestFrame();
    c.scheduler.cancel();
    c.scheduler.requestFrame();
    expectCalls(c.host, {Call::kPostFrameCallback, Call::kPostFrameCallback},
                "cancel: the callback is posted again");
  }
  {
    Case c(Window::kShowsLatestFrame);
    c.scheduler.requestFrame();
    c.scheduler.requestFrame();
    c.scheduler.requestFrame();
    expectCalls(c.host, {Call::kPresent, Call::kPresentHeld, Call::kPresent},
                "cancel: one in the window, one held, one waiting");
    c.scheduler.cancel();
    // The frame held went with the surface: a draw hands nothing over, and
    // the waiting request is forgotten.
    c.scheduler.onFrameConsumed();
    expectCalls(c.host, {}, "cancel: nothing held, nothing waiting");
    c.scheduler.requestFrame();
    expectCalls(c.host, {Call::kPresent, Call::kPresentHeld},
                "cancel: the frame in the window is forgotten");
  }
}

void aDisplayLinkPausesWhenNoCallbackIsOutstanding() {
  // What SkiaView.mm asks after each tick: the link stays on while a
  // callback is outstanding (more queued), and pauses otherwise.
  Case c(Window::kShowsEachFrame);
  c.host.results.push_back(kPresented | kMoreQueued);
  c.scheduler.requestFrame();
  if (!c.scheduler.isFrameCallbackPosted()) {
    std::fprintf(stderr, "FAIL: display link: armed by a request\n");
    failures++;
  }
  c.scheduler.onFrame();
  if (!c.scheduler.isFrameCallbackPosted()) {
    std::fprintf(stderr, "FAIL: display link: kept on while more is queued\n");
    failures++;
  }
  c.scheduler.onFrame();
  if (c.scheduler.isFrameCallbackPosted()) {
    std::fprintf(stderr,
                 "FAIL: display link: paused once the queue is empty\n");
    failures++;
  }
}

} // namespace

int main() {
  surfaceViewFrameIsPresentedOnTheNextVsync();
  surfaceViewNeverHandsOverAHeldFrame();
  textureViewFrameIsHandedOverOnTheSpotWhileTheWindowHasNone();
  textureViewNextFrameIsReplayedAtOnceAndHandedOverOnceTheWindowDrew();
  textureViewLeftoverIsReplayedAtOnceAndHandedOverOnceTheWindowDrew();
  textureViewLeftoverBehindAHeldFrameWaits();
  textureViewFrameTheWindowCouldNotTakeIsTriedOnTheNextVsync();
  textureViewHeldFrameTheWindowDidNotGetLeavesItIdle();
  surfaceViewLeftoverIsPresentedOnTheNextVsync();
  frameForAResizedWindowIsPresentedOnTheSpot();
  leftoverOfAFrameForAResizedWindowWaitsLikeAnyOther();
  requestsWaitingForTheSameFrameArePostedOnce();
  requestAfterTheFrameRanIsPostedAgain();
  withoutABackingViewNothingIsPostedOrPresented();
  cancelDropsOutstandingRequestsAndTheFramesInAndForTheWindow();
  aDisplayLinkPausesWhenNoCallbackIsOutstanding();
  if (failures == 0) {
    std::printf("FrameSchedulerTest: passed\n");
    return 0;
  }
  std::fprintf(stderr, "FrameSchedulerTest: %d failure(s)\n", failures);
  return 1;
}
