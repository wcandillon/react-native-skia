// Host-side checks of RNSkia::PresentFrameResult, the mask a view's present
// hands its platform view, and of Android's copy of its bits (see run.sh).

#include <fstream>
#include <regex>
#include <sstream>
#include <string>

#include "Expect.h"

#include "rnskia/RNSkPresentFrameResult.h"

namespace RNSkia {
namespace {

// run.sh runs the tests from packages/skia.
constexpr const char *kFrameSchedulerSource =
    "android/src/main/java/com/reactnative/skia/FrameScheduler.java";

std::string readFile(const char *path) {
  std::ifstream file(path);
  std::stringstream contents;
  contents << file.rdbuf();
  return contents.str();
}

/** The value FrameScheduler.java gives `name`, or -1 when it declares none. */
int readJavaConstant(const std::string &source, const std::string &name) {
  std::smatch match;
  const std::regex declaration("static final int " + name + " = (\\d+);");
  return std::regex_search(source, match, declaration) ? std::stoi(match[1])
                                                       : -1;
}

TEST_CASE(AndroidSpellsTheSameBits) {
  const auto source = readFile(kFrameSchedulerSource);
  REQUIRE(!source.empty());
  EXPECT(readJavaConstant(source, "PRESENTED") == kFramePresented);
  EXPECT(readJavaConstant(source, "MORE_QUEUED") == kMoreQueued);
  EXPECT(readJavaConstant(source, "REPLAY_COMING") == kReplayComing);
  EXPECT(readJavaConstant(source, "HELD_FOR_GPU") == kHeldForGpu);
}

TEST_CASE(EachResultIsABitOfItsOwn) {
  constexpr int kBits[] = {kFramePresented, kMoreQueued, kReplayComing,
                           kHeldForGpu};
  for (int bit : kBits) {
    EXPECT(bit != 0 && (bit & (bit - 1)) == 0);
    for (int other : kBits) {
      EXPECT(bit == other || (bit & other) == 0);
    }
  }
}

constexpr PresentOutcome kIdle = {.framePresented = false,
                                  .windowCanPresent = true,
                                  .recordingsQueued = false,
                                  .heldFrame = HeldFrame::kNone,
                                  .replaying = false};

TEST_CASE(SaysAFrameWentToTheWindow) {
  auto outcome = kIdle;
  EXPECT(presentFrameResult(outcome) == kNothingPresented);
  outcome.framePresented = true;
  EXPECT(presentFrameResult(outcome) == kFramePresented);
}

TEST_CASE(LeavesAQueuedFrameForTheNextFrame) {
  auto queued = kIdle;
  queued.recordingsQueued = true;
  EXPECT(presentFrameResult(queued) == kMoreQueued);
}

TEST_CASE(AsksToTryAFrameHeldForTheGpuAgainSoon) {
  auto outcome = kIdle;
  outcome.heldFrame = HeldFrame::kWaitingForGpu;
  EXPECT(presentFrameResult(outcome) == (kMoreQueued | kHeldForGpu));
}

TEST_CASE(LeavesNothingOfAHeldFrameItPresented) {
  auto outcome = kIdle;
  outcome.framePresented = true;
  outcome.heldFrame = HeldFrame::kPresented;
  EXPECT(presentFrameResult(outcome) == kFramePresented);
}

TEST_CASE(LeavesNoFrameWhileTheWindowCannotShowOne) {
  auto outcome = kIdle;
  outcome.windowCanPresent = false;
  outcome.recordingsQueued = true;
  outcome.heldFrame = HeldFrame::kWaitingForGpu;
  EXPECT(presentFrameResult(outcome) == kNothingPresented);
}

TEST_CASE(AsksForEveryFrameWhileAReplayIsComing) {
  auto outcome = kIdle;
  outcome.replaying = true;
  EXPECT(presentFrameResult(outcome) == kReplayComing);
  outcome.windowCanPresent = false;
  EXPECT(presentFrameResult(outcome) == kReplayComing);
}

TEST_CASE(AsksForAnotherFrameWhileOneIsLeftOrAReplayIsComing) {
  EXPECT(!asksForAnotherFrame(kNothingPresented));
  EXPECT(!asksForAnotherFrame(kFramePresented));
  EXPECT(asksForAnotherFrame(kMoreQueued));
  EXPECT(asksForAnotherFrame(kReplayComing));
  EXPECT(asksForAnotherFrame(kFramePresented | kMoreQueued));
  EXPECT(asksForAnotherFrame(kFramePresented | kReplayComing));
}

} // namespace
} // namespace RNSkia

int main() { return expect::runTestCases("RNSkPresentFrameResultTest"); }
