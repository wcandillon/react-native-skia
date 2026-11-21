// Host-side check of RNSkia::waitForDrawing (see run.sh): a drawing is waited
// for until it is done or until its device is no longer in use, however long
// the GPU takes, and the same inputs give the same answer after the same
// number of slices.

#include <unistd.h>

#include <chrono>
#include <cstdio>

#include "rnskia/RNSkDrawingWait.h"

namespace {

using namespace std::chrono_literals;
using RNSkia::waitForDrawing;

int failures = 0;

void expect(bool condition, const char *what) {
  if (!condition) {
    std::fprintf(stderr, "FAIL: %s\n", what);
    failures++;
  }
}

constexpr auto kSlice = 100ms;

// A drawing, scripted by slice: the slice it is done in, and the slice its
// device stops being in use.
struct Script {
  int doneAtSlice = -1;
  int lostAtSlice = -1;
};

struct Outcome {
  bool done;
  int slices;
};

Outcome run(const Script &script) {
  int slice = 0;
  const bool done = waitForDrawing(
      [&](std::chrono::milliseconds asked) {
        expect(asked == kSlice, "each wait is one slice");
        return slice++ == script.doneAtSlice;
      },
      [&]() { return script.lostAtSlice < 0 || slice <= script.lostAtSlice; },
      kSlice);
  return {done, slice};
}

void aDrawingDoneIsDone() {
  Script script;
  script.doneAtSlice = 3;
  const auto outcome = run(script);
  expect(outcome.done, "a drawing done is done");
  expect(outcome.slices == 4, "it is waited for until it is done");
}

// Held for a minute, as iOS holds an app's work in the background, or slow on
// a busy GPU: no time ends the wait.
void aSlowDrawingIsWaitedForUntilItIsDone() {
  Script script;
  script.doneAtSlice = 600;
  const auto outcome = run(script);
  expect(outcome.done, "a drawing the GPU is still running is done once it is");
  expect(outcome.slices == 601, "it is waited for until it is done");
}

void aDeviceLostEndsTheWait() {
  Script script;
  script.lostAtSlice = 2;
  const auto outcome = run(script);
  expect(!outcome.done, "a drawing whose device is lost is not waited for");
  expect(outcome.slices == 3, "the loss is noticed after the slice it began");
}

void aDrawingDoneAsItsDeviceIsLostIsDone() {
  Script script;
  script.doneAtSlice = 1;
  script.lostAtSlice = 1;
  const auto outcome = run(script);
  expect(outcome.done,
         "a drawing the GPU finished in the slice its device was lost in is "
         "done");
}

void theSameScriptGivesTheSameOutcome() {
  Script script;
  script.doneAtSlice = 12;
  script.lostAtSlice = 40;
  const auto first = run(script);
  const auto second = run(script);
  expect(first.done == second.done && first.slices == second.slices,
         "waiting is deterministic");
}

} // namespace

int main() {
  // A wait that never ends fails the run instead of hanging it.
  alarm(30);
  aDrawingDoneIsDone();
  aSlowDrawingIsWaitedForUntilItIsDone();
  aDeviceLostEndsTheWait();
  aDrawingDoneAsItsDeviceIsLostIsDone();
  theSameScriptGivesTheSameOutcome();
  if (failures != 0) {
    std::fprintf(stderr, "%d failure(s)\n", failures);
    return 1;
  }
  std::printf("DrawingWaitTest: all passed\n");
  return 0;
}
