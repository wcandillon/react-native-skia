// Host-side check of RNSkia::RNSkWorker (see run.sh): the jobs behind one that
// throws still run, whatever it throws, and a job's result is delivered once,
// a null one when making it threw.

#include <chrono>
#include <cstdio>
#include <functional>
#include <future>
#include <memory>
#include <stdexcept>
#include <utility>
#include <vector>

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

// Jobs run one at a time, in order: once the job behind has run, so has the
// delivery, which holds what it writes as that job holds its promise.
static bool deliversOnce(const std::shared_ptr<int> &expected,
                         std::function<std::shared_ptr<int>()> make) {
  auto delivered = std::make_shared<std::vector<std::shared_ptr<int>>>();
  auto ran = std::make_shared<std::promise<void>>();
  auto next = ran->get_future();
  RNSkia::RNSkWorker::getInstance().post(
      std::move(make), [delivered](std::shared_ptr<int> result) {
        delivered->push_back(std::move(result));
      });
  RNSkia::RNSkWorker::getInstance().post([ran]() { ran->set_value(); });
  return next.wait_for(std::chrono::seconds(5)) == std::future_status::ready &&
         *delivered == std::vector<std::shared_ptr<int>>{expected};
}

int main() {
  if (!runsTheJobAfter([]() { throw std::runtime_error("a job failed"); })) {
    return fail("the job after one that threw a std::exception did not run");
  }
  if (!runsTheJobAfter([]() { throw 42; })) {
    return fail("the job after one that threw something else did not run");
  }
  auto made = std::make_shared<int>();
  if (!deliversOnce(made, [made]() { return made; })) {
    return fail("a job's result was not delivered once");
  }
  if (!deliversOnce(nullptr, []() -> std::shared_ptr<int> {
        throw std::runtime_error("making the result failed");
      })) {
    return fail("a job that threw a std::exception did not deliver a null "
                "result once");
  }
  if (!deliversOnce(nullptr, []() -> std::shared_ptr<int> { throw 42; })) {
    return fail("a job that threw something else did not deliver a null "
                "result once");
  }
  std::printf("WorkerTest: passed\n");
  return 0;
}
