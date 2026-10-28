// Host-side check of RNSkia::RNSkWorker (see run.sh): the jobs behind one that
// throws still run, whatever it throws.

#include <chrono>
#include <cstdio>
#include <functional>
#include <future>
#include <memory>
#include <stdexcept>
#include <utility>

#include "rnskia/RNSkWorker.h"

static int fail(const char *message) {
  std::fprintf(stderr, "FAIL: %s\n", message);
  return 1;
}

// The job holds the promise it fulfils: a check that gave up waiting has
// returned by the time a late job runs.
static bool runsTheJobAfter(std::function<void()> throwing) {
  auto ran = std::make_shared<std::promise<void>>();
  auto next = ran->get_future();
  RNSkia::RNSkWorker::getInstance().post(std::move(throwing));
  RNSkia::RNSkWorker::getInstance().post([ran]() { ran->set_value(); });
  return next.wait_for(std::chrono::seconds(5)) == std::future_status::ready;
}

int main() {
  if (!runsTheJobAfter([]() { throw std::runtime_error("a job failed"); })) {
    return fail("the job after one that threw a std::exception did not run");
  }
  if (!runsTheJobAfter([]() { throw 42; })) {
    return fail("the job after one that threw something else did not run");
  }
  std::printf("WorkerTest: passed\n");
  return 0;
}
