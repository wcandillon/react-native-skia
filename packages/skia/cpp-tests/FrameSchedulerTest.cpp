// Host-side check of rnsurface::FrameScheduler (see run.sh): the cases of
// the Java FrameSchedulerTest it replaced, with a host that records what the
// scheduler asks of it. A window that shows each frame stands in for a
// SurfaceView (and a CAMetalLayer), one that shows the latest frame for a
// TextureView.

#include <cstdio>
#include <deque>
#include <vector>

#include "rnsurface/FrameScheduler.h"

namespace {

using rnsurface::FrameScheduler;
using Window = FrameScheduler::Window;

enum class Call { kPostFrameCallback, kPresent };

constexpr int kPresented = FrameScheduler::kPresented;
constexpr int kMoreQueued = FrameScheduler::kMoreQueued;

class RecordingHost : public FrameScheduler::Host {
public:
  std::vector<Call> calls;
  // What the next presents report; kPresented once these run out.
  std::deque<int> results;

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

void textureViewFrameIsPresentedOnTheSpotWhileTheWindowHasNone() {
  Case c(Window::kShowsLatestFrame);
  c.scheduler.requestFrame();
  expectCalls(c.host, {Call::kPresent}, "latest-frame: presented on the spot");
}

void textureViewNextFrameWaitsForTheWindowToDrawThePrevious() {
  Case c(Window::kShowsLatestFrame);
  c.scheduler.requestFrame();
  c.scheduler.requestFrame();
  expectCalls(c.host, {Call::kPresent}, "latest-frame: one at a time");
  c.scheduler.onFrameConsumed();
  expectCalls(c.host, {Call::kPresent}, "latest-frame: the next once drawn");
  // Nothing was requested since: the window's next draw presents nothing.
  c.scheduler.onFrameConsumed();
  expectCalls(c.host, {}, "latest-frame: nothing requested, nothing presented");
}

void textureViewLeftoverWaitsForTheWindowToDraw() {
  Case c(Window::kShowsLatestFrame);
  c.host.results.push_back(kPresented | kMoreQueued);
  c.scheduler.requestFrame();
  expectCalls(c.host, {Call::kPresent}, "latest-frame leftover: first present");
  c.scheduler.onFrameConsumed();
  expectCalls(c.host, {Call::kPresent},
              "latest-frame leftover: presented once drawn");
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
  expectCalls(c.host, {Call::kPresent},
              "latest-frame declined: the vsync presents");
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
    // Also while the latest-frame window has a frame it has not drawn.
    Case c(Window::kShowsLatestFrame);
    c.scheduler.requestFrame();
    c.scheduler.requestFrame(/* forResizedWindow= */ true);
    expectCalls(c.host, {Call::kPresent, Call::kPresent},
                "resized: latest-frame presents on the spot");
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
    expectCalls(c.host, {Call::kPresent},
                "resized leftover: latest-frame waits");
    c.scheduler.onFrameConsumed();
    expectCalls(c.host, {Call::kPresent},
                "resized leftover: presented once drawn");
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

void cancelDropsOutstandingRequestsAndTheFrameInTheWindow() {
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
    c.scheduler.cancel();
    c.scheduler.requestFrame();
    expectCalls(c.host, {Call::kPresent, Call::kPresent},
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
  textureViewFrameIsPresentedOnTheSpotWhileTheWindowHasNone();
  textureViewNextFrameWaitsForTheWindowToDrawThePrevious();
  textureViewLeftoverWaitsForTheWindowToDraw();
  textureViewFrameTheWindowCouldNotTakeIsTriedOnTheNextVsync();
  surfaceViewLeftoverIsPresentedOnTheNextVsync();
  frameForAResizedWindowIsPresentedOnTheSpot();
  leftoverOfAFrameForAResizedWindowWaitsLikeAnyOther();
  requestsWaitingForTheSameFrameArePostedOnce();
  requestAfterTheFrameRanIsPostedAgain();
  withoutABackingViewNothingIsPostedOrPresented();
  cancelDropsOutstandingRequestsAndTheFrameInTheWindow();
  aDisplayLinkPausesWhenNoCallbackIsOutstanding();
  if (failures == 0) {
    std::printf("FrameSchedulerTest: passed\n");
    return 0;
  }
  std::fprintf(stderr, "FrameSchedulerTest: %d failure(s)\n", failures);
  return 1;
}
