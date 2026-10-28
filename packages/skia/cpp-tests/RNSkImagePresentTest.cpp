// Host-side checks of RNSkia::presentMadeImage, the order in which a window
// decides on a frame, has its image made and presents it (see run.sh).

#include <memory>
#include <string>
#include <vector>

#include "Expect.h"

#include "rnskia/RNSkImagePresent.h"

namespace RNSkia {
namespace {

/** A window's lock that records who held it when. */
struct RecordingLock {
  bool held = false;
  std::vector<std::string> *log = nullptr;

  void lock() {
    REQUIRE(!held);
    held = true;
    log->push_back("lock");
  }

  // Called by the guard's destructor, so a failure is reported, never thrown.
  void unlock() {
    EXPECT(held);
    held = false;
    log->push_back("unlock");
  }
};

/** A window's present of a made image, each step logged with its lock. */
struct Present {
  std::vector<std::string> log;
  RecordingLock lock{.log = &log};
  std::vector<bool> takesFrame = {true, true};
  bool makesImage = true;
  ImagePresent onPresent = ImagePresent::kPresented;

  ImagePresent run() {
    size_t decision = 0;
    return presentMadeImage(
        lock,
        [&]() {
          log.push_back(lock.held ? "decide, locked" : "decide, unlocked");
          return takesFrame.at(decision++);
        },
        [&]() {
          log.push_back(lock.held ? "make, locked" : "make, unlocked");
          return makesImage ? std::make_shared<int>(1) : nullptr;
        },
        [&](const std::shared_ptr<int> &) {
          log.push_back(lock.held ? "present, locked" : "present, unlocked");
          return onPresent;
        });
  }
};

TEST_CASE(TheImageIsMadeWithoutTheWindowsLock) {
  Present present;
  EXPECT(present.run() == ImagePresent::kPresented);
  EXPECT(present.log == std::vector<std::string>{"lock", "decide, locked",
                                                 "unlock", "make, unlocked",
                                                 "lock", "decide, locked",
                                                 "present, locked", "unlock"});
}

TEST_CASE(AWindowThatTakesNoFrameCostsNoReplay) {
  Present present;
  present.takesFrame = {false};
  EXPECT(present.run() == ImagePresent::kDeclined);
  EXPECT(present.log ==
         std::vector<std::string>{"lock", "decide, locked", "unlock"});
}

TEST_CASE(AWindowThatStoppedTakingFramesWhileTheImageWasMadeDeclinesIt) {
  Present present;
  present.takesFrame = {true, false};
  EXPECT(present.run() == ImagePresent::kDeclined);
  EXPECT(present.log == std::vector<std::string>{"lock", "decide, locked",
                                                 "unlock", "make, unlocked",
                                                 "lock", "decide, locked",
                                                 "unlock"});
}

TEST_CASE(NoImageConsumesTheFrameWithoutTakingTheLockAgain) {
  Present present;
  present.makesImage = false;
  EXPECT(present.run() == ImagePresent::kConsumed);
  EXPECT(present.log == std::vector<std::string>{"lock", "decide, locked",
                                                 "unlock", "make, unlocked"});
}

TEST_CASE(APresentThatGetsNoTextureDeclinesWithTheImageMade) {
  Present present;
  present.onPresent = ImagePresent::kDeclined;
  EXPECT(present.run() == ImagePresent::kDeclined);
  EXPECT(!present.lock.held);
}

} // namespace
} // namespace RNSkia

int main() { return expect::runTestCases("RNSkImagePresentTest"); }
