// Host-side check of rnsurface::FrameScheduler (see run.sh): the cases of
// the Java FrameSchedulerTest it replaced, with a host that records what the
// scheduler asks of it. A window that shows each frame stands in for a
// SurfaceView (and a CAMetalLayer), one that shows the latest frame for a
// TextureView.

#include <chrono>
#include <cstdio>
#include <deque>
#include <vector>

#include "rnsurface/FrameScheduler.h"

namespace {

using rnsurface::FrameScheduler;
using std::chrono::milliseconds;
using Window = FrameScheduler::Window;

enum class Call {
  kPostFrameCallback,
  kPresentOnRequest,
  kPresentOnVsync,
  kPresentOnWindowDraw,
  kPresentHeldFrame,
  kTick,
  kPostHeldFrameRetry,
};

constexpr int kPresented = FrameScheduler::kPresented;
constexpr int kMoreQueued = FrameScheduler::kMoreQueued;
constexpr int kReplayComing = FrameScheduler::kReplayComing;
constexpr int kHeldForGpu = FrameScheduler::kHeldForGpu;

Call presentCallOn(FrameScheduler::PresentOn on) {
  switch (on) {
  case FrameScheduler::PresentOn::kRequest:
    return Call::kPresentOnRequest;
  case FrameScheduler::PresentOn::kVsync:
    return Call::kPresentOnVsync;
  case FrameScheduler::PresentOn::kWindowDraw:
    return Call::kPresentOnWindowDraw;
  case FrameScheduler::PresentOn::kHeldFrameRetry:
    return Call::kPresentHeldFrame;
  }
  return Call::kPresentOnRequest;
}

class RecordingHost : public FrameScheduler::Host {
public:
  std::vector<Call> calls;
  // What the next presents report; kPresented once these run out.
  std::deque<int> results;
  // What the next ticks report; nothing once these run out.
  std::deque<int> tickResults;
  // The delays the held frame retries were posted with.
  std::vector<milliseconds> heldFrameRetryDelays;

  void postFrameCallback() override {
    calls.push_back(Call::kPostFrameCallback);
  }

  int presentFrame(FrameScheduler::PresentOn on) override {
    calls.push_back(presentCallOn(on));
    return next(results, kPresented);
  }

  int tickOnVsync() override {
    calls.push_back(Call::kTick);
    return next(tickResults, FrameScheduler::kNothingPresented);
  }

  void postHeldFrameRetry(milliseconds delay) override {
    calls.push_back(Call::kPostHeldFrameRetry);
    heldFrameRetryDelays.push_back(delay);
  }

  std::vector<Call> takeCalls() {
    auto taken = calls;
    calls.clear();
    return taken;
  }

private:
  static int next(std::deque<int> &queue, int otherwise) {
    if (queue.empty()) {
      return otherwise;
    }
    const int result = queue.front();
    queue.pop_front();
    return result;
  }
};

int failures = 0;

void expectCalls(RecordingHost &host, const std::vector<Call> &expected,
                 const char *what) {
  const auto actual = host.takeCalls();
  if (actual != expected) {
    std::fprintf(stderr, "FAIL: %s: expected %zu call(s), got %zu\n", what,
                 expected.size(), actual.size());
    failures++;
  }
}

void expectDelays(const RecordingHost &host,
                  const std::vector<milliseconds> &expected, const char *what) {
  if (host.heldFrameRetryDelays != expected) {
    std::fprintf(stderr, "FAIL: %s: the retry delays differ\n", what);
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
  expectCalls(c.host, {Call::kPresentOnVsync},
              "each-frame: the vsync presents");
}

void textureViewFrameIsPresentedOnTheSpotWhileTheWindowHasNone() {
  Case c(Window::kShowsLatestFrame);
  c.scheduler.requestFrame();
  expectCalls(c.host, {Call::kPresentOnRequest},
              "latest-frame: presented on the spot");
}

void textureViewNextFrameWaitsForTheWindowToDrawThePrevious() {
  Case c(Window::kShowsLatestFrame);
  c.scheduler.requestFrame();
  c.scheduler.requestFrame();
  expectCalls(c.host, {Call::kPresentOnRequest}, "latest-frame: one at a time");
  c.scheduler.onFrameConsumed();
  expectCalls(c.host, {Call::kPresentOnWindowDraw},
              "latest-frame: the next once drawn");
  // Nothing was requested since: the window's next draw presents nothing,
  // and the request after it goes on the spot.
  c.scheduler.onFrameConsumed();
  expectCalls(c.host, {}, "latest-frame: nothing requested, nothing presented");
  c.scheduler.requestFrame();
  expectCalls(c.host, {Call::kPresentOnRequest},
              "latest-frame: drawn, the next request goes on the spot");
}

void textureViewLeftoverWaitsForTheWindowToDraw() {
  Case c(Window::kShowsLatestFrame);
  c.host.results.push_back(kPresented | kMoreQueued);
  c.scheduler.requestFrame();
  expectCalls(c.host, {Call::kPresentOnRequest},
              "latest-frame leftover: first present");
  c.scheduler.onFrameConsumed();
  expectCalls(c.host, {Call::kPresentOnWindowDraw},
              "latest-frame leftover: presented once drawn");
}

void textureViewFrameTheWindowCouldNotTakeIsTriedOnTheNextVsync() {
  Case c(Window::kShowsLatestFrame);
  c.host.results.push_back(kMoreQueued);
  c.scheduler.requestFrame();
  expectCalls(c.host, {Call::kPresentOnRequest, Call::kPostFrameCallback},
              "latest-frame declined: retried on the vsync");
  // Requests meanwhile wait for that vsync.
  c.scheduler.requestFrame();
  expectCalls(c.host, {},
              "latest-frame declined: a request waits for the vsync");
  c.scheduler.onFrame();
  expectCalls(c.host, {Call::kPresentOnVsync},
              "latest-frame declined: the vsync presents");
}

void textureViewFrameHeldForTheGpuIsNotInTheWindow() {
  Case c(Window::kShowsLatestFrame);
  c.host.results.push_back(kMoreQueued);
  c.scheduler.requestFrame();
  c.scheduler.onFrame();
  expectCalls(c.host,
              {Call::kPresentOnRequest, Call::kPostFrameCallback,
               Call::kPresentOnVsync},
              "latest-frame held: tried again on the vsync");
  // The held frame went to the window at that vsync: the next waits for its
  // draw.
  c.scheduler.requestFrame();
  expectCalls(c.host, {}, "latest-frame held: the next waits for the draw");
  c.scheduler.onFrameConsumed();
  expectCalls(c.host, {Call::kPresentOnWindowDraw},
              "latest-frame held: the draw presents the next");
}

void textureViewLeftoverRetriedOnceTheWindowGotAFrameWaitsForItsDraw() {
  Case c(Window::kShowsLatestFrame);
  c.host.results.push_back(kMoreQueued);
  c.scheduler.requestFrame();
  // A redraw put a frame in the window before the retry's vsync came.
  c.scheduler.onRedrawn(kPresented);
  c.scheduler.onFrame();
  expectCalls(c.host,
              {Call::kPresentOnRequest, Call::kPostFrameCallback, Call::kTick},
              "latest-frame retry: the vsync only ticks");
  c.scheduler.onFrameConsumed();
  expectCalls(c.host, {Call::kPresentOnWindowDraw},
              "latest-frame retry: the draw presents the leftover");
}

// The GPU finishing the frame before a held one is no event the view hears:
// the scheduler presents the held frame a moment later, alone, through the
// host like any present, so that the platform view sees it go.
void frameHeldForTheGpuIsTriedAgainSoonThroughTheHost() {
  Case c(Window::kShowsEachFrame);
  c.host.results.push_back(kMoreQueued | kHeldForGpu);
  c.scheduler.requestFrame();
  c.scheduler.onFrame();
  expectCalls(c.host,
              {Call::kPostFrameCallback, Call::kPresentOnVsync,
               Call::kPostFrameCallback, Call::kPostHeldFrameRetry},
              "held: retried on the vsync and a moment later");
  c.scheduler.onHeldFrameRetry();
  expectCalls(c.host, {Call::kPresentHeldFrame},
              "held: the retry presents the held frame");
}

void textureViewFrameTheRetryPresentedWaitsForTheWindowToDrawIt() {
  Case c(Window::kShowsLatestFrame);
  c.host.results.push_back(kMoreQueued | kHeldForGpu);
  c.scheduler.requestFrame();
  expectCalls(c.host,
              {Call::kPresentOnRequest, Call::kPostFrameCallback,
               Call::kPostHeldFrameRetry},
              "latest-frame held: retried on the vsync and a moment later");
  c.scheduler.onHeldFrameRetry();
  expectCalls(c.host, {Call::kPresentHeldFrame},
              "latest-frame held: the retry presents it");
  // The retried frame is in the window: the vsync only ticks, and no frame
  // replaces it before the window draws it.
  c.scheduler.onFrame();
  expectCalls(c.host, {Call::kTick},
              "latest-frame held: the vsync after the retry only ticks");
}

void heldFrameRetryOutstandingIsPostedOnce() {
  Case c(Window::kShowsEachFrame);
  c.host.results.push_back(kMoreQueued | kHeldForGpu);
  c.host.results.push_back(kMoreQueued | kHeldForGpu);
  c.scheduler.requestFrame();
  c.scheduler.onFrame();
  c.scheduler.onFrame();
  expectCalls(c.host,
              {Call::kPostFrameCallback, Call::kPresentOnVsync,
               Call::kPostFrameCallback, Call::kPostHeldFrameRetry,
               Call::kPresentOnVsync, Call::kPostFrameCallback},
              "held twice: one retry outstanding");
}

void heldFrameRetryThatFindsTheFrameStillHeldPostsOneMore() {
  Case c(Window::kShowsEachFrame);
  c.host.results.push_back(kMoreQueued | kHeldForGpu);
  c.host.results.push_back(kMoreQueued | kHeldForGpu);
  c.scheduler.requestFrame();
  c.scheduler.onFrame();
  c.host.takeCalls();
  c.scheduler.onHeldFrameRetry();
  expectCalls(c.host, {Call::kPresentHeldFrame, Call::kPostHeldFrameRetry},
              "still held: the retry posts the next one");
}

void textureViewRetryPresentsNothingOnceTheVsyncPresentedTheFrame() {
  Case c(Window::kShowsLatestFrame);
  c.host.results.push_back(kMoreQueued | kHeldForGpu);
  c.scheduler.requestFrame();
  c.scheduler.onFrame();
  expectCalls(c.host,
              {Call::kPresentOnRequest, Call::kPostFrameCallback,
               Call::kPostHeldFrameRetry, Call::kPresentOnVsync},
              "latest-frame held: the vsync presents the frame");
  c.scheduler.onHeldFrameRetry();
  expectCalls(c.host, {},
              "latest-frame held: the retry after it presents nothing");
}

// A retry still outstanding once the vsync presented the held frame comes
// between the view's frames: it presents a held frame alone, so a recording
// submitted since waits for the vsync like any frame of the window.
void surfaceViewRetryOnceTheVsyncPresentedTheHeldFrameLeavesTheNextFrameToTheVsync() {
  Case c(Window::kShowsEachFrame);
  c.host.results.push_back(kMoreQueued | kHeldForGpu);
  c.scheduler.requestFrame();
  c.scheduler.onFrame();
  c.scheduler.onFrame();
  c.scheduler.requestFrame();
  expectCalls(c.host,
              {Call::kPostFrameCallback, Call::kPresentOnVsync,
               Call::kPostFrameCallback, Call::kPostHeldFrameRetry,
               Call::kPresentOnVsync, Call::kPostFrameCallback},
              "held then presented: the request waits for the vsync");
  c.host.results.push_back(kMoreQueued);
  c.scheduler.onHeldFrameRetry();
  expectCalls(c.host, {Call::kPresentHeldFrame},
              "held then presented: the retry presents the held frame alone");
  c.scheduler.onFrame();
  expectCalls(c.host, {Call::kPresentOnVsync},
              "held then presented: the vsync presents the next");
}

// A redraw presents outside the scheduler: a frame it leaves held for the GPU
// is presented a moment later, as one a present of the scheduler's leaves,
// and on the next vsync.
void surfaceViewFrameARedrawHeldForTheGpuIsTriedAgainSoon() {
  Case c(Window::kShowsEachFrame);
  c.scheduler.onRedrawn(kMoreQueued | kHeldForGpu);
  expectCalls(c.host, {Call::kPostFrameCallback, Call::kPostHeldFrameRetry},
              "redraw held: retried on the vsync and a moment later");
  c.scheduler.onHeldFrameRetry();
  expectCalls(c.host, {Call::kPresentHeldFrame},
              "redraw held: the retry presents the held frame");
}

void textureViewFrameARedrawPresentedWaitsForTheWindowToDrawIt() {
  Case c(Window::kShowsLatestFrame);
  c.scheduler.onRedrawn(kPresented);
  c.scheduler.requestFrame();
  expectCalls(c.host, {}, "latest-frame redraw: the next waits for the draw");
  c.scheduler.onFrameConsumed();
  expectCalls(c.host, {Call::kPresentOnWindowDraw},
              "latest-frame redraw: the draw presents the next");
}

void redrawWithoutABackingViewSchedulesNothing() {
  Case c(Window::kNone);
  c.scheduler.onRedrawn(kMoreQueued | kHeldForGpu);
  expectCalls(c.host, {}, "no window: a redraw schedules nothing");
}

void cancelForgetsTheHeldFrameRetry() {
  Case c(Window::kShowsLatestFrame);
  c.host.results.push_back(kMoreQueued | kHeldForGpu);
  c.scheduler.requestFrame();
  c.host.takeCalls();
  c.scheduler.cancel();
  c.host.results.push_back(kMoreQueued | kHeldForGpu);
  c.scheduler.requestFrame();
  expectCalls(c.host,
              {Call::kPresentOnRequest, Call::kPostFrameCallback,
               Call::kPostHeldFrameRetry},
              "cancel: the next held frame posts its retry");
}

void heldFrameRetriesBackOffWhileTheGpuStaysBusyAndStartSoonForTheNextFrame() {
  Case c(Window::kShowsEachFrame);
  for (int held = 0; held < 4; held++) {
    c.host.results.push_back(kMoreQueued | kHeldForGpu);
  }
  c.host.results.push_back(kPresented);
  c.scheduler.requestFrame();
  c.scheduler.onFrame();
  for (int retry = 0; retry < 4; retry++) {
    c.scheduler.onHeldFrameRetry();
  }
  expectDelays(
      c.host,
      {milliseconds(1), milliseconds(2), milliseconds(4), milliseconds(4)},
      "back off: 1, 2, then 4 ms");
  c.host.results.push_back(kMoreQueued | kHeldForGpu);
  c.scheduler.onFrame();
  expectDelays(c.host,
               {milliseconds(1), milliseconds(2), milliseconds(4),
                milliseconds(4), milliseconds(1)},
               "back off: the next held frame starts at 1 ms");
}

void cancelStartsTheNextHeldFrameRetrySoon() {
  Case c(Window::kShowsLatestFrame);
  c.host.results.push_back(kMoreQueued | kHeldForGpu);
  c.host.results.push_back(kMoreQueued | kHeldForGpu);
  c.scheduler.requestFrame();
  c.scheduler.onHeldFrameRetry();
  c.scheduler.cancel();
  c.host.results.push_back(kMoreQueued | kHeldForGpu);
  c.scheduler.requestFrame();
  expectDelays(c.host, {milliseconds(1), milliseconds(2), milliseconds(1)},
               "cancel: the next retry starts at 1 ms");
}

void aHeldFrameRetryIsAskedForUntilItRunsOrTheSchedulerCancels() {
  // What a host whose retry has no cancel reads before it calls
  // onHeldFrameRetry() (JniSkiaView, SkiaView.mm).
  Case c(Window::kShowsEachFrame);
  c.host.results.push_back(kMoreQueued | kHeldForGpu);
  c.scheduler.requestFrame();
  c.scheduler.onFrame();
  if (!c.scheduler.isHeldFrameRetryPosted()) {
    std::fprintf(stderr, "FAIL: held frame retry: asked for by a held frame\n");
    failures++;
  }
  c.scheduler.onHeldFrameRetry();
  if (c.scheduler.isHeldFrameRetryPosted()) {
    std::fprintf(stderr, "FAIL: held frame retry: no longer asked for once "
                         "it presented the frame\n");
    failures++;
  }
  c.host.results.push_back(kMoreQueued | kHeldForGpu);
  c.scheduler.onFrame();
  c.scheduler.cancel();
  if (c.scheduler.isHeldFrameRetryPosted()) {
    std::fprintf(
        stderr, "FAIL: held frame retry: no longer asked for after a cancel\n");
    failures++;
  }
}

void heldFrameRetryWithoutABackingViewPresentsNothing() {
  Case c(Window::kNone);
  c.scheduler.onHeldFrameRetry();
  expectCalls(c.host, {}, "no window: a retry presents nothing");
}

void surfaceViewLeftoverIsPresentedOnTheNextVsync() {
  Case c(Window::kShowsEachFrame);
  c.host.results.push_back(kPresented | kMoreQueued);
  c.scheduler.requestFrame();
  c.scheduler.onFrame();
  expectCalls(c.host,
              {Call::kPostFrameCallback, Call::kPresentOnVsync,
               Call::kPostFrameCallback},
              "each-frame leftover: posted again");
  c.scheduler.onFrame();
  expectCalls(c.host, {Call::kPresentOnVsync},
              "each-frame leftover: the next vsync presents");
}

void aReplayComingKeepsTheVsyncTicking() {
  Case c(Window::kShowsEachFrame);
  // A present that left a replay in flight asks for the next frame, which
  // counts its ticks (see RNSkReplaySchedule).
  c.host.results.push_back(kReplayComing);
  c.host.results.push_back(kReplayComing);
  c.scheduler.requestFrame();
  c.scheduler.onFrame();
  c.scheduler.onFrame();
  c.scheduler.onFrame();
  expectCalls(c.host,
              {Call::kPostFrameCallback, Call::kPresentOnVsync,
               Call::kPostFrameCallback, Call::kPresentOnVsync,
               Call::kPostFrameCallback, Call::kPresentOnVsync},
              "a replay coming: every vsync presents");
}

void textureViewVsyncOnlyTicksWhileItsWindowHasAFrameToDraw() {
  Case c(Window::kShowsLatestFrame);
  c.host.results.push_back(kPresented | kReplayComing);
  c.host.tickResults.push_back(kReplayComing);
  c.scheduler.requestFrame();
  c.scheduler.onFrame();
  expectCalls(c.host,
              {Call::kPresentOnRequest, Call::kPostFrameCallback, Call::kTick,
               Call::kPostFrameCallback},
              "latest-frame replay: the vsync ticks while the window draws");
  c.host.results.push_back(kReplayComing);
  c.scheduler.onFrameConsumed();
  expectCalls(c.host, {Call::kPresentOnWindowDraw},
              "latest-frame replay: the draw presents what came");
  c.scheduler.onFrame();
  expectCalls(c.host, {Call::kPresentOnVsync},
              "latest-frame replay: drawn, the vsync presents");
}

void textureViewTickWithoutAReplayComingAsksForNoMoreVsyncs() {
  Case c(Window::kShowsLatestFrame);
  c.host.results.push_back(kPresented | kReplayComing);
  c.scheduler.requestFrame();
  c.scheduler.onFrame();
  expectCalls(c.host,
              {Call::kPresentOnRequest, Call::kPostFrameCallback, Call::kTick},
              "latest-frame tick: no replay, no more vsyncs");
}

void textureViewRequestWhileTheVsyncOnlyTicksIsPresentedOnTheSpot() {
  Case c(Window::kShowsLatestFrame);
  c.host.results.push_back(kReplayComing);
  c.scheduler.requestFrame();
  expectCalls(c.host, {Call::kPresentOnRequest, Call::kPostFrameCallback},
              "latest-frame tick: the vsync is asked for to tick");
  c.scheduler.requestFrame();
  expectCalls(c.host, {Call::kPresentOnRequest},
              "latest-frame tick: a request goes on the spot");
  // The window has that frame now: the vsync only ticks.
  c.scheduler.onFrame();
  expectCalls(c.host, {Call::kTick},
              "latest-frame tick: the vsync after it only ticks");
}

void textureViewLeftoverWithAReplayComingTicksUntilTheWindowDraws() {
  Case c(Window::kShowsLatestFrame);
  c.host.results.push_back(kPresented | kMoreQueued | kReplayComing);
  c.host.tickResults.push_back(kReplayComing);
  c.scheduler.requestFrame();
  c.scheduler.onFrame();
  expectCalls(c.host,
              {Call::kPresentOnRequest, Call::kPostFrameCallback, Call::kTick,
               Call::kPostFrameCallback},
              "latest-frame leftover and replay: ticks");
  c.scheduler.onFrameConsumed();
  expectCalls(c.host, {Call::kPresentOnWindowDraw},
              "latest-frame leftover and replay: the draw presents");
}

void frameForAResizedWindowIsPresentedOnTheSpot() {
  {
    Case c(Window::kShowsEachFrame);
    c.scheduler.requestFrame(/* forResizedWindow= */ true);
    expectCalls(c.host, {Call::kPresentOnRequest},
                "resized: each-frame presents on the spot");
  }
  {
    // Also while the latest-frame window has a frame it has not drawn.
    Case c(Window::kShowsLatestFrame);
    c.scheduler.requestFrame();
    c.scheduler.requestFrame(/* forResizedWindow= */ true);
    expectCalls(c.host, {Call::kPresentOnRequest, Call::kPresentOnRequest},
                "resized: latest-frame presents on the spot");
  }
}

void leftoverOfAFrameForAResizedWindowWaitsLikeAnyOther() {
  {
    Case c(Window::kShowsEachFrame);
    c.host.results.push_back(kPresented | kMoreQueued);
    c.scheduler.requestFrame(/* forResizedWindow= */ true);
    expectCalls(c.host, {Call::kPresentOnRequest, Call::kPostFrameCallback},
                "resized leftover: each-frame posts");
  }
  {
    Case c(Window::kShowsLatestFrame);
    c.host.results.push_back(kPresented | kMoreQueued);
    c.scheduler.requestFrame(/* forResizedWindow= */ true);
    expectCalls(c.host, {Call::kPresentOnRequest},
                "resized leftover: latest-frame waits");
    c.scheduler.onFrameConsumed();
    expectCalls(c.host, {Call::kPresentOnWindowDraw},
                "resized leftover: presented once drawn");
  }
}

void requestsWaitingForTheSameFrameArePostedOnce() {
  Case c(Window::kShowsEachFrame);
  c.scheduler.requestFrame();
  c.scheduler.requestFrame();
  c.scheduler.onFrame();
  expectCalls(c.host, {Call::kPostFrameCallback, Call::kPresentOnVsync},
              "two requests, one callback");
}

void requestAfterTheFrameRanIsPostedAgain() {
  Case c(Window::kShowsEachFrame);
  c.scheduler.requestFrame();
  c.scheduler.onFrame();
  c.scheduler.requestFrame();
  c.scheduler.onFrame();
  expectCalls(c.host,
              {Call::kPostFrameCallback, Call::kPresentOnVsync,
               Call::kPostFrameCallback, Call::kPresentOnVsync},
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

void aRetryEndsWithItsVsyncEvenWithoutABackingView() {
  Case c(Window::kShowsLatestFrame);
  c.host.results.push_back(kMoreQueued);
  c.scheduler.requestFrame();
  c.scheduler.setWindow(Window::kNone);
  c.scheduler.onFrame();
  c.host.takeCalls();
  c.scheduler.setWindow(Window::kShowsLatestFrame);
  c.scheduler.requestFrame();
  expectCalls(c.host, {Call::kPresentOnRequest},
              "no window at the vsync: the retry is over");
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
    expectCalls(c.host, {Call::kPresentOnRequest, Call::kPresentOnRequest},
                "cancel: the frame in the window is forgotten");
  }
}

void cancelDropsAnOutstandingRetry() {
  Case c(Window::kShowsLatestFrame);
  c.host.results.push_back(kMoreQueued);
  c.scheduler.requestFrame();
  c.scheduler.cancel();
  c.host.takeCalls();
  c.scheduler.requestFrame();
  expectCalls(c.host, {Call::kPresentOnRequest},
              "cancel: the retry is forgotten");
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
  textureViewFrameHeldForTheGpuIsNotInTheWindow();
  textureViewLeftoverRetriedOnceTheWindowGotAFrameWaitsForItsDraw();
  frameHeldForTheGpuIsTriedAgainSoonThroughTheHost();
  textureViewFrameTheRetryPresentedWaitsForTheWindowToDrawIt();
  heldFrameRetryOutstandingIsPostedOnce();
  heldFrameRetryThatFindsTheFrameStillHeldPostsOneMore();
  textureViewRetryPresentsNothingOnceTheVsyncPresentedTheFrame();
  surfaceViewRetryOnceTheVsyncPresentedTheHeldFrameLeavesTheNextFrameToTheVsync();
  surfaceViewFrameARedrawHeldForTheGpuIsTriedAgainSoon();
  textureViewFrameARedrawPresentedWaitsForTheWindowToDrawIt();
  redrawWithoutABackingViewSchedulesNothing();
  cancelForgetsTheHeldFrameRetry();
  heldFrameRetriesBackOffWhileTheGpuStaysBusyAndStartSoonForTheNextFrame();
  cancelStartsTheNextHeldFrameRetrySoon();
  aHeldFrameRetryIsAskedForUntilItRunsOrTheSchedulerCancels();
  heldFrameRetryWithoutABackingViewPresentsNothing();
  surfaceViewLeftoverIsPresentedOnTheNextVsync();
  aReplayComingKeepsTheVsyncTicking();
  textureViewVsyncOnlyTicksWhileItsWindowHasAFrameToDraw();
  textureViewTickWithoutAReplayComingAsksForNoMoreVsyncs();
  textureViewRequestWhileTheVsyncOnlyTicksIsPresentedOnTheSpot();
  textureViewLeftoverWithAReplayComingTicksUntilTheWindowDraws();
  frameForAResizedWindowIsPresentedOnTheSpot();
  leftoverOfAFrameForAResizedWindowWaitsLikeAnyOther();
  requestsWaitingForTheSameFrameArePostedOnce();
  requestAfterTheFrameRanIsPostedAgain();
  withoutABackingViewNothingIsPostedOrPresented();
  aRetryEndsWithItsVsyncEvenWithoutABackingView();
  cancelDropsOutstandingRequestsAndTheFrameInTheWindow();
  cancelDropsAnOutstandingRetry();
  aDisplayLinkPausesWhenNoCallbackIsOutstanding();
  if (failures == 0) {
    std::printf("FrameSchedulerTest: passed\n");
    return 0;
  }
  std::fprintf(stderr, "FrameSchedulerTest: %d failure(s)\n", failures);
  return 1;
}
