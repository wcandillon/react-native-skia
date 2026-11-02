// Host-side check of RNSkia::RNSkRedrawRequest, the request a view's redraw
// takes and the window state it reads (see run.sh). What the main thread does
// meanwhile (an attach, a detach, the app coming back) lands between the
// redraw's steps through the stand-in window below.

#include <cstddef>
#include <cstdio>
#include <functional>
#include <vector>

#include "rnskia/RNSkRedrawRequest.h"

namespace {

using RNSkia::RNSkRedrawRequest;
using RNSkia::RNSkWindowState;
using Start = RNSkRedrawRequest::Start;

int failures = 0;

void expect(bool condition, const char *what) {
  if (!condition) {
    std::fprintf(stderr, "FAIL: %s\n", what);
    failures++;
  }
}

// A window the main thread changes under a redraw: each read returns the
// state the window has, and what the main thread does runs right before or
// right after a read, one step per read.
struct Window {
  RNSkWindowState state = RNSkWindowState::kReady;
  std::vector<std::function<void(Window &)>> beforeRead;
  std::vector<std::function<void(Window &)>> afterRead;
  size_t reads = 0;

  RNSkWindowState readState(int *info) {
    if (reads < beforeRead.size() && beforeRead[reads]) {
      beforeRead[reads](*this);
    }
    const auto read = state;
    if (info != nullptr) {
      *info = 1;
    }
    if (reads < afterRead.size() && afterRead[reads]) {
      afterRead[reads](*this);
    }
    reads++;
    return read;
  }
};

void oneRedrawWaitsAtATime() {
  RNSkRedrawRequest redraw;
  Window window;
  expect(redraw.request(), "the first request posts a redraw");
  expect(!redraw.request(), "a request while one waits posts nothing");
  int info = 0;
  expect(redraw.start(window, &info) == Start::kPresent,
         "a redraw onto a ready window presents");
  expect(redraw.request(),
         "a request once the redraw started posts one of its own");
}

void anAttachWhileARedrawFindsNoWindowIsNotSwallowed() {
  RNSkRedrawRequest redraw;
  Window window;
  window.state = RNSkWindowState::kNone;
  expect(redraw.request(), "the request posts a redraw");
  bool attachPosted = false;
  // The window attaches right after the redraw read that there was none.
  window.afterRead = {[&](Window &read) {
    read.state = RNSkWindowState::kReady;
    attachPosted = redraw.request();
  }};
  int info = 0;
  expect(redraw.start(window, &info) == Start::kSkip,
         "a redraw that finds no window presents nothing");
  expect(attachPosted,
         "an attach while a redraw finds no window posts a redraw of its own");
}

void aDetachDuringARedrawLetsTheNextAttachAskAgain() {
  RNSkRedrawRequest redraw;
  Window window;
  expect(redraw.request(), "the request posts a redraw");
  // The window is detached right after the redraw reads it.
  window.afterRead = {
      [](Window &read) { read.state = RNSkWindowState::kNone; }};
  int info = 0;
  expect(redraw.start(window, &info) == Start::kPresent,
         "the redraw presents onto the window it read");
  window.state = RNSkWindowState::kReady;
  expect(redraw.request(), "the attach after a detach during a redraw posts "
                           "a redraw of its own");
}

void aRedrawWithoutADeviceLetsTheReplacementAskAgain() {
  RNSkRedrawRequest redraw;
  Window window;
  window.state = RNSkWindowState::kNoDevice;
  expect(redraw.request(), "the request posts a redraw");
  int info = 0;
  expect(redraw.start(window, &info) == Start::kSkip,
         "a redraw without a GPU device presents nothing");
  // The device replaced, every view is asked for a redraw (RNSkManager).
  window.state = RNSkWindowState::kReady;
  expect(redraw.request(), "the device's replacement posts a redraw");
}

void aWindowThatCannotPresentGetsTheRedrawOnceItCan() {
  RNSkRedrawRequest redraw;
  Window window;
  window.state = RNSkWindowState::kCannotPresent;
  expect(redraw.request(), "the request posts a redraw");
  int info = 0;
  expect(redraw.start(window, &info) == Start::kSkip,
         "a redraw onto a window that cannot present presents nothing");
  window.state = RNSkWindowState::kReady;
  expect(redraw.onCanPresent(),
         "the window able to present again gets the redraw it missed");
  expect(redraw.isWaiting(), "the redraw posted then finds its request");
}

// Where the app comes back, the platform view calling onCanPresent(),
// against a redraw that finds the window unable to present.
enum class CanPresentAt {
  kBeforeTheRedraw,
  kAfterTheFirstRead,
  kBeforeTheSecondRead,
  kAfterTheSecondRead,
  kAfterTheRedraw,
};

void aWindowThatCanPresentAgainAroundTheRedrawGetsOneRedraw(
    CanPresentAt canPresentAt, const char *what) {
  RNSkRedrawRequest redraw;
  Window window;
  window.state = RNSkWindowState::kCannotPresent;
  expect(redraw.request(), "the request posts a redraw");
  int posted = 0;
  const auto comesBack = [&](Window &read) {
    read.state = RNSkWindowState::kReady;
    if (redraw.onCanPresent()) {
      posted++;
    }
  };
  switch (canPresentAt) {
  case CanPresentAt::kBeforeTheRedraw:
    comesBack(window);
    break;
  case CanPresentAt::kAfterTheFirstRead:
    window.afterRead = {comesBack};
    break;
  case CanPresentAt::kBeforeTheSecondRead:
    window.beforeRead = {nullptr, comesBack};
    break;
  case CanPresentAt::kAfterTheSecondRead:
    window.afterRead = {nullptr, comesBack};
    break;
  case CanPresentAt::kAfterTheRedraw:
    break;
  }
  int info = 0;
  const auto start = redraw.start(window, &info);
  if (start == Start::kPostAgain) {
    posted++;
  }
  if (canPresentAt == CanPresentAt::kAfterTheRedraw) {
    comesBack(window);
  }
  expect(posted + (start == Start::kPresent ? 1 : 0) == 1, what);
  expect(posted == 0 || redraw.isWaiting(),
         "a redraw posted then finds its request");
}

void aRedrawThatPresentsLeavesNoneOwed() {
  RNSkRedrawRequest redraw;
  Window window;
  window.state = RNSkWindowState::kCannotPresent;
  expect(redraw.request(), "the request posts a redraw");
  int info = 0;
  expect(redraw.start(window, &info) == Start::kSkip,
         "a redraw onto a window that cannot present presents nothing");
  // Able to present again, the window gets a redraw from elsewhere first (a
  // layout).
  window.state = RNSkWindowState::kReady;
  expect(redraw.request(), "a request once the redraw started posts one");
  expect(redraw.start(window, &info) == Start::kPresent,
         "a redraw onto the window that can present presents");
  expect(!redraw.onCanPresent(), "the redraw that presented leaves none owed");
}

void aRedrawWithNothingToShowOwesNone() {
  RNSkRedrawRequest redraw;
  Window window;
  window.state = RNSkWindowState::kNone;
  expect(redraw.request(), "the request posts a redraw");
  int info = 0;
  expect(redraw.start(window, &info) == Start::kSkip,
         "a redraw that finds no window presents nothing");
  window.state = RNSkWindowState::kReady;
  expect(!redraw.onCanPresent(), "a redraw dropped for want of a window is not "
                                 "owed when the app comes back");
}

} // namespace

int main() {
  oneRedrawWaitsAtATime();
  anAttachWhileARedrawFindsNoWindowIsNotSwallowed();
  aDetachDuringARedrawLetsTheNextAttachAskAgain();
  aRedrawWithoutADeviceLetsTheReplacementAskAgain();
  aWindowThatCannotPresentGetsTheRedrawOnceItCan();
  aWindowThatCanPresentAgainAroundTheRedrawGetsOneRedraw(
      CanPresentAt::kBeforeTheRedraw,
      "a window able to present before the redraw gets exactly one");
  aWindowThatCanPresentAgainAroundTheRedrawGetsOneRedraw(
      CanPresentAt::kAfterTheFirstRead,
      "a window able to present before the redraw is owed gets exactly one");
  aWindowThatCanPresentAgainAroundTheRedrawGetsOneRedraw(
      CanPresentAt::kBeforeTheSecondRead,
      "a window able to present once the redraw is owed gets exactly one");
  aWindowThatCanPresentAgainAroundTheRedrawGetsOneRedraw(
      CanPresentAt::kAfterTheSecondRead,
      "a window able to present after the redraw read it again gets exactly "
      "one");
  aWindowThatCanPresentAgainAroundTheRedrawGetsOneRedraw(
      CanPresentAt::kAfterTheRedraw,
      "a window able to present after the redraw gets exactly one");
  aRedrawThatPresentsLeavesNoneOwed();
  aRedrawWithNothingToShowOwesNone();
  if (failures > 0) {
    return 1;
  }
  std::printf("RedrawRequestTest: passed\n");
  return 0;
}
