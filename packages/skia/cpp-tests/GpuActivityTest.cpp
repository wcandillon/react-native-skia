// Host-side check of RNSkia::RNSkGpuActivity::lastUse (see run.sh), the time
// DawnContext's memory release decides with: the epoch before any work, the
// time it is given while work is marked, and when the last marked work ended
// once none is.

#include <chrono>
#include <cstdio>

#include "rnskia/RNSkGpuActivity.h"

namespace {

using RNSkia::RNSkGpuActivity;
using Clock = std::chrono::steady_clock;

int failures = 0;

void expect(bool condition, const char *what) {
  if (!condition) {
    std::fprintf(stderr, "FAIL: %s\n", what);
    failures++;
  }
}

Clock::time_point later() { return Clock::now() + std::chrono::hours(1); }

void beforeAnyWorkTheLastUseIsTheEpoch() {
  expect(RNSkGpuActivity::getInstance().lastUse(later()) == Clock::time_point(),
         "before any work the last use is the epoch");
}

void whileWorkIsMarkedTheLastUseIsNow() {
  auto &activity = RNSkGpuActivity::getInstance();
  const auto now = later();
  {
    RNSkGpuActivity::Scope work;
    expect(activity.lastUse(now) == now,
           "while work is marked the last use is the time given");
    {
      RNSkGpuActivity::Scope nested;
      expect(activity.lastUse(now) == now, "nested work is marked as well");
    }
    expect(activity.lastUse(now) == now,
           "work still marked keeps the last use at the time given");
  }
  expect(activity.lastUse(now) < now,
         "once no work is marked the last use is no longer the time given");
}

void onceWorkEndsTheLastUseIsItsEnd() {
  auto &activity = RNSkGpuActivity::getInstance();
  Clock::time_point beforeEnd;
  {
    RNSkGpuActivity::Scope work;
    beforeEnd = Clock::now();
  }
  const auto afterEnd = Clock::now();
  const auto lastUse = activity.lastUse(later());
  expect(lastUse >= beforeEnd && lastUse <= afterEnd,
         "the last use is when the work ended");
  expect(activity.lastUse(later()) == lastUse,
         "the last use stays until more work is marked");
}

} // namespace

int main() {
  beforeAnyWorkTheLastUseIsTheEpoch();
  whileWorkIsMarkedTheLastUseIsNow();
  onceWorkEndsTheLastUseIsItsEnd();
  if (failures > 0) {
    return 1;
  }
  std::printf("GpuActivityTest: passed\n");
  return 0;
}
