// Host-side check of RNSkia::RNSkWorker's dedicated workers (see run.sh):
// jobs run in the order they were posted, and the idle callback runs once
// each time the queue empties, after the last job of a burst.

#include <chrono>
#include <cstdio>
#include <future>
#include <mutex>
#include <string>
#include <vector>

#include "rnskia/RNSkWorker.h"

namespace {

using namespace std::chrono_literals;
using RNSkia::RNSkWorker;

int failures = 0;

void expect(bool condition, const char *what) {
  if (!condition) {
    std::fprintf(stderr, "FAIL: %s\n", what);
    failures++;
  }
}

// What a worker did, in order: each job by name, and "idle".
struct Trace {
  std::mutex mutex;
  std::vector<std::string> events;
  std::promise<void> idled;
  bool waiting = true;

  void add(const std::string &event) {
    std::lock_guard<std::mutex> lock(mutex);
    events.push_back(event);
    if (event == "idle" && waiting) {
      waiting = false;
      idled.set_value();
    }
  }

  std::future<void> nextIdle() {
    std::lock_guard<std::mutex> lock(mutex);
    idled = std::promise<void>();
    waiting = true;
    return idled.get_future();
  }

  std::vector<std::string> snapshot() {
    std::lock_guard<std::mutex> lock(mutex);
    return events;
  }
};

void aBurstEndsWithOneIdle() {
  auto *trace = new Trace();
  auto &worker = RNSkWorker::makeDedicated("Worker test",
                                           [trace]() { trace->add("idle"); });
  std::promise<void> release;
  auto released = release.get_future().share();
  auto idle = trace->nextIdle();
  worker.post([trace, released]() {
    released.wait();
    trace->add("first");
  });
  worker.post([trace]() { trace->add("second"); });
  worker.post([trace]() { trace->add("third"); });
  release.set_value();
  expect(idle.wait_for(5s) == std::future_status::ready,
         "the worker goes idle once the burst is done");
  expect(trace->snapshot() ==
             std::vector<std::string>({"first", "second", "third", "idle"}),
         "the jobs run in order, then the idle callback, once");

  auto again = trace->nextIdle();
  worker.post([trace]() { trace->add("later"); });
  expect(again.wait_for(5s) == std::future_status::ready,
         "a later job is followed by idle again");
  expect(trace->snapshot().back() == "idle",
         "the idle callback runs after the later job");
}

void aWorkerWithoutAnIdleCallbackRunsItsJobs() {
  auto &worker = RNSkWorker::makeDedicated("Worker test 2");
  std::promise<void> ran;
  auto done = ran.get_future();
  worker.post([&ran]() { ran.set_value(); });
  expect(done.wait_for(5s) == std::future_status::ready, "the job runs");
}

} // namespace

int main() {
  aBurstEndsWithOneIdle();
  aWorkerWithoutAnIdleCallbackRunsItsJobs();
  if (failures != 0) {
    std::fprintf(stderr, "%d failure(s)\n", failures);
    return 1;
  }
  std::printf("WorkerTest: all passed\n");
  return 0;
}
