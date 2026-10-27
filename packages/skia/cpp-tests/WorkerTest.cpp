// Host-side check of RNSkia::RNSkWorker, the background thread static canvases
// present on (see run.sh): the worker runs the jobs behind one that throws,
// whatever it throws.

#include <chrono>
#include <cstdio>
#include <functional>
#include <future>
#include <memory>
#include <stdexcept>
#include <utility>

#include "rnskia/RNSkWorker.h"

namespace {

using RNSkia::RNSkWorker;

int failures = 0;

void expect(bool condition, const char *what) {
  if (!condition) {
    std::fprintf(stderr, "FAIL: %s\n", what);
    failures++;
  }
}

// Whether a job posted after `throwing` runs.
// The job holds the promise it fulfils: a test that gave up waiting has
// returned by the time a late job runs.
bool runsTheJobAfter(std::function<void()> throwing) {
  auto ran = std::make_shared<std::promise<void>>();
  auto next = ran->get_future();
  RNSkWorker::getInstance().post(std::move(throwing));
  RNSkWorker::getInstance().post([ran]() { ran->set_value(); });
  return next.wait_for(std::chrono::seconds(5)) == std::future_status::ready;
}

void theJobAfterOneThrowingAnErrorRuns() {
  expect(runsTheJobAfter([]() { throw std::runtime_error("a job failed"); }),
         "a job after one that threw a std::exception runs");
}

void theJobAfterOneThrowingAnythingElseRuns() {
  expect(runsTheJobAfter([]() { throw 42; }),
         "a job after one that threw something else runs");
}

} // namespace

int main() {
  theJobAfterOneThrowingAnErrorRuns();
  theJobAfterOneThrowingAnythingElseRuns();
  if (failures > 0) {
    return 1;
  }
  std::printf("WorkerTest: passed\n");
  return 0;
}
