// Host-side checks of RNSkia::presentFrameResult, what a view's present hands
// its platform view in the frame scheduler's mask (see run.sh).

#include <cstdio>

#include "rnskia/RNSkPresentFrameResult.h"

namespace RNSkia {
namespace {

int failures = 0;

bool expect(bool condition, const char *what) {
  if (!condition) {
    std::fprintf(stderr, "FAIL: %s\n", what);
    failures++;
  }
  return condition;
}

void eachResultIsABitOfItsOwn() {
  constexpr int kBits[] = {
      PresentResult::kPresented, PresentResult::kMoreQueued,
      PresentResult::kReplayComing, PresentResult::kHeldForGpu};
  for (int bit : kBits) {
    expect(bit != 0 && (bit & (bit - 1)) == 0,
           "bit != 0 && (bit & (bit - 1)) == 0");
    for (int other : kBits) {
      expect(bit == other || (bit & other) == 0,
             "bit == other || (bit & other) == 0");
    }
  }
}

constexpr PresentOutcome kIdle = {.framePresented = false,
                                  .windowCanPresent = true,
                                  .recordingsQueued = false,
                                  .heldFrame = HeldFrame::kNone,
                                  .replaying = false};

void saysAFrameWentToTheWindow() {
  auto outcome = kIdle;
  expect(presentFrameResult(outcome) == PresentResult::kNothingPresented,
         "presentFrameResult(outcome) == PresentResult::kNothingPresented");
  outcome.framePresented = true;
  expect(presentFrameResult(outcome) == PresentResult::kPresented,
         "presentFrameResult(outcome) == PresentResult::kPresented");
}

void leavesAQueuedFrameForTheNextFrame() {
  auto queued = kIdle;
  queued.recordingsQueued = true;
  expect(presentFrameResult(queued) == PresentResult::kMoreQueued,
         "presentFrameResult(queued) == PresentResult::kMoreQueued");
}

void asksToTryAFrameHeldForTheGpuAgainSoon() {
  auto outcome = kIdle;
  outcome.heldFrame = HeldFrame::kWaitingForGpu;
  expect(presentFrameResult(outcome) ==
             (PresentResult::kMoreQueued | PresentResult::kHeldForGpu),
         "presentFrameResult(outcome) == (PresentResult::kMoreQueued | "
         "PresentResult::kHeldForGpu)");
}

void leavesNothingOfAHeldFrameItPresented() {
  auto outcome = kIdle;
  outcome.framePresented = true;
  outcome.heldFrame = HeldFrame::kPresented;
  expect(presentFrameResult(outcome) == PresentResult::kPresented,
         "presentFrameResult(outcome) == PresentResult::kPresented");
}

void leavesNoFrameWhileTheWindowCannotShowOne() {
  auto outcome = kIdle;
  outcome.windowCanPresent = false;
  outcome.recordingsQueued = true;
  outcome.heldFrame = HeldFrame::kWaitingForGpu;
  expect(presentFrameResult(outcome) == PresentResult::kNothingPresented,
         "presentFrameResult(outcome) == PresentResult::kNothingPresented");
}

void asksForEveryFrameWhileAReplayIsComing() {
  auto outcome = kIdle;
  outcome.replaying = true;
  expect(presentFrameResult(outcome) == PresentResult::kReplayComing,
         "presentFrameResult(outcome) == PresentResult::kReplayComing");
  outcome.windowCanPresent = false;
  expect(presentFrameResult(outcome) == PresentResult::kReplayComing,
         "presentFrameResult(outcome) == PresentResult::kReplayComing");
}

void asksForAnotherFrameWhileOneIsLeftOrAReplayIsComing() {
  expect(!asksForAnotherFrame(PresentResult::kNothingPresented),
         "!asksForAnotherFrame(PresentResult::kNothingPresented)");
  expect(!asksForAnotherFrame(PresentResult::kPresented),
         "!asksForAnotherFrame(PresentResult::kPresented)");
  expect(asksForAnotherFrame(PresentResult::kMoreQueued),
         "asksForAnotherFrame(PresentResult::kMoreQueued)");
  expect(asksForAnotherFrame(PresentResult::kReplayComing),
         "asksForAnotherFrame(PresentResult::kReplayComing)");
  expect(asksForAnotherFrame(PresentResult::kPresented |
                             PresentResult::kMoreQueued),
         "asksForAnotherFrame(PresentResult::kPresented | "
         "PresentResult::kMoreQueued)");
  expect(asksForAnotherFrame(PresentResult::kPresented |
                             PresentResult::kReplayComing),
         "asksForAnotherFrame(PresentResult::kPresented | "
         "PresentResult::kReplayComing)");
}

} // namespace
} // namespace RNSkia

int main() {
  RNSkia::eachResultIsABitOfItsOwn();
  RNSkia::saysAFrameWentToTheWindow();
  RNSkia::leavesAQueuedFrameForTheNextFrame();
  RNSkia::asksToTryAFrameHeldForTheGpuAgainSoon();
  RNSkia::leavesNothingOfAHeldFrameItPresented();
  RNSkia::leavesNoFrameWhileTheWindowCannotShowOne();
  RNSkia::asksForEveryFrameWhileAReplayIsComing();
  RNSkia::asksForAnotherFrameWhileOneIsLeftOrAReplayIsComing();
  if (RNSkia::failures == 0) {
    std::printf("RNSkPresentFrameResultTest: passed\n");
    return 0;
  }
  std::fprintf(stderr, "RNSkPresentFrameResultTest: %d failure(s)\n",
               RNSkia::failures);
  return 1;
}
