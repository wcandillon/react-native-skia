// Host-side check of RNSkia::RNSkDeviceUses (see run.sh): a device is
// destroyed once the calls into it in flight end, none starting meanwhile,
// and a call made only while the device is not lost makes none once it is.

#include <atomic>
#include <chrono>
#include <cstdio>
#include <future>
#include <thread>

#include "rnskia/RNSkDeviceUses.h"

namespace {

using namespace std::chrono_literals;
using RNSkia::RNSkDeviceUses;

int failures = 0;

void expect(bool condition, const char *what) {
  if (!condition) {
    std::fprintf(stderr, "FAIL: %s\n", what);
    failures++;
  }
}

// Long enough for a thread that is not held to have run.
constexpr auto kSettle = 50ms;

} // namespace

int main() {
  {
    // A call in flight as the device is lost ends before it is destroyed.
    RNSkDeviceUses uses;
    std::atomic<bool> lost{false};
    std::atomic<bool> inCall{false};
    std::promise<void> entered;
    std::promise<void> finish;
    std::thread caller([&]() {
      uses.runUnlessLost(lost, [&]() {
        inCall = true;
        entered.set_value();
        finish.get_future().wait();
        inCall = false;
      });
    });
    entered.get_future().wait();
    lost = true;
    std::atomic<bool> destroyed{false};
    bool destroyedDuringCall = false;
    std::thread destroyer([&]() {
      uses.destroyAfterUses([&]() {
        destroyedDuringCall = inCall.load();
        destroyed = true;
      });
    });
    std::this_thread::sleep_for(kSettle);
    expect(!destroyed, "the destruction waits for the call in flight");
    finish.set_value();
    caller.join();
    destroyer.join();
    expect(destroyed && !destroyedDuringCall,
           "the device is destroyed once the call ended");
  }
  {
    // A use that comes during the destruction waits for it to end.
    RNSkDeviceUses uses;
    std::promise<void> destroying;
    std::promise<void> finishDestroy;
    std::atomic<bool> destroyFinished{false};
    std::thread destroyer([&]() {
      uses.destroyAfterUses([&]() {
        destroying.set_value();
        finishDestroy.get_future().wait();
        destroyFinished = true;
      });
    });
    destroying.get_future().wait();
    std::atomic<bool> used{false};
    bool usedBeforeTheDestroyEnded = true;
    std::thread user([&]() {
      RNSkDeviceUses::Use use(uses);
      usedBeforeTheDestroyEnded = !destroyFinished.load();
      used = true;
    });
    std::this_thread::sleep_for(kSettle);
    expect(!used, "a use waits while the device is destroyed");
    finishDestroy.set_value();
    destroyer.join();
    user.join();
    expect(used && !usedBeforeTheDestroyEnded,
           "the use goes ahead once the destruction ended");
  }
  {
    // Once the device is lost, a call made only while it is not lost is
    // not made.
    RNSkDeviceUses uses;
    std::atomic<bool> lost{false};
    int calls = 0;
    expect(uses.runUnlessLost(lost, [&]() { calls++; }) && calls == 1,
           "a call runs while the device is not lost");
    lost = true;
    expect(!uses.runUnlessLost(lost, [&]() { calls++; }) && calls == 1,
           "no call runs once the device is lost");
  }
  if (failures == 0) {
    std::printf("DeviceUsesTest: passed\n");
    return 0;
  }
  std::fprintf(stderr, "DeviceUsesTest: %d failure(s)\n", failures);
  return 1;
}
