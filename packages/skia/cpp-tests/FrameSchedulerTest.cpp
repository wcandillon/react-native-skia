// Host-side check of rnsurface::FrameScheduler (see run.sh): the cases of
// the Java FrameSchedulerTest it replaced, with a host that records what the
// scheduler asks of it. A window that shows each frame stands in for a
// SurfaceView (and a CAMetalLayer), one that shows the latest frame for a
// TextureView.

#include <cstdio>
#include <deque>
#include <vector>

#include "rnsurface/FrameScheduler.h"
#include "rnsurface/DisplayLinkPacing.h"

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

void schedulerStopsRequestingCallbacksOnceTheQueueIsEmpty() {
  // The scheduler's demand only: the Apple host may retain a following
  // callback to cover replay or confirm idle even after this demand ends.
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
                 "FAIL: scheduler: no callback requested once the queue is empty\n");
    failures++;
  }
}

void lateFrameUsesTheCurrentIntervalAndKeepsItsRetry() {
  Case c(Window::kShowsEachFrame);
  c.host.results.push_back(kMoreQueued);
  c.scheduler.requestFrameInCurrentInterval();
  expectCalls(c.host, {Call::kPresent, Call::kPostFrameCallback},
              "late frame: try now, retry on next vsync if declined");
  c.scheduler.onFrame();
  expectCalls(c.host, {Call::kPresent}, "late frame: retry presents");
}

void lateFrameDoesNotChangeLatestFrameBackpressure() {
  Case c(Window::kShowsLatestFrame);
  c.scheduler.requestFrame();
  c.scheduler.requestFrameInCurrentInterval();
  expectCalls(c.host, {Call::kPresent}, "late latest-frame: still one at a time");
  c.scheduler.onFrameConsumed();
  expectCalls(c.host, {Call::kPresent}, "late latest-frame: waits for consumption");
}

void lateFrameDoesNotCancelAPostedCallbackOrPresentWithoutAWindow() {
  Case c(Window::kShowsEachFrame);
  c.scheduler.requestFrame();
  c.scheduler.requestFrameInCurrentInterval();
  expectCalls(c.host, {Call::kPostFrameCallback, Call::kPresent},
              "late frame: existing callback is retained");
  if (!c.scheduler.isFrameCallbackPosted()) failures++;
  c.scheduler.setWindow(Window::kNone);
  c.scheduler.requestFrameInCurrentInterval();
  expectCalls(c.host, {}, "late frame: no window, no present");
}

void displayLinkKeepsTheGapBeforeTheNextReplayAndAdmitsItLate() {
  rnsurface::DisplayLinkPacing pacing;
  const auto expect = [](bool value, const char *what) {
    if (!value) { std::fprintf(stderr, "FAIL: %s\n", what); failures++; }
  };
  expect(!pacing.canPresentLate(10), "no tick: cannot present late");
  pacing.onTick(10.016);
  pacing.onPresented();
  // No replay exists yet. Keeping this demand, not only in-flight work,
  // is what bridges the gap until the next UI update starts its replay.
  expect(pacing.hasPresented(), "present: keep the following callback");
  expect(!pacing.canPresentLate(10.008), "one present per interval");
  pacing.onTick(10.032);
  expect(!pacing.hasPresented(), "empty callback: no continuing idle demand");
  expect(pacing.canPresentLate(10.0164), "replay ready after empty callback");
  pacing.onPresented();
  expect(!pacing.canPresentLate(10.017), "late frame uses the interval once");
  pacing.onTick(10.048);
  expect(!pacing.canPresentLate(10.048), "deadline itself is not open");
  expect(!pacing.canPresentLate(10.049), "expired deadline is not open");
  pacing.onPresented();
  expect(pacing.hasPresentedInInterval(10.040), "resize cannot double-present");
  expect(!pacing.hasPresentedInInterval(10.049), "expired interval allows resize");
  pacing.reset();
  expect(!pacing.hasPresented() && !pacing.canPresentLate(0),
         "detach resets presentation and deadline");
}

} // namespace

int main() {
  lateFrameUsesTheCurrentIntervalAndKeepsItsRetry();
  lateFrameDoesNotChangeLatestFrameBackpressure();
  lateFrameDoesNotCancelAPostedCallbackOrPresentWithoutAWindow();
  displayLinkKeepsTheGapBeforeTheNextReplayAndAdmitsItLate();
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
  schedulerStopsRequestingCallbacksOnceTheQueueIsEmpty();
  if (failures == 0) {
    std::printf("FrameSchedulerTest: passed\n");
    return 0;
  }
  std::fprintf(stderr, "FrameSchedulerTest: %d failure(s)\n", failures);
  return 1;
}
