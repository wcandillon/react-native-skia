// Host-side check of RNSkia::RNSkIdleTaskSchedule, when a thread of the render
// pool runs the idle task and whether idle (see run.sh). The times are made
// up: each case says when the requests came and the thread's jobs ended.

#include <chrono>
#include <cstdio>
#include <optional>

#include "rnskia/RNSkThreadPool.h"

namespace {

using RNSkia::RNSkIdleTaskSchedule;
using Clock = RNSkIdleTaskSchedule::Clock;

constexpr auto kDelay = std::chrono::milliseconds(2000);
constexpr auto kTick = Clock::duration(1);

int failures = 0;

void expect(bool condition, const char *what) {
  if (!condition) {
    std::fprintf(stderr, "FAIL: %s\n", what);
    failures++;
  }
}

Clock::time_point at(int milliseconds) {
  return Clock::time_point() + std::chrono::milliseconds(milliseconds);
}

void aThreadWithNoJobSinceTheRequestRunsTheTaskIdle() {
  RNSkIdleTaskSchedule schedule(kDelay, at(0));
  expect(!schedule.due(0, at(0)).has_value(),
         "a thread nothing asked owes no run");
  expect(schedule.due(1, at(10000)) == at(12000),
         "a request is due the delay after it");
  expect(schedule.run(1, at(12000)),
         "a thread with no job since runs the task idle");
  expect(!schedule.due(1, at(10000)).has_value(),
         "a thread that ran the task idle owes nothing");
}

// Another view's frame, or the dropped view's own last job, ending after the
// request.
void aThreadThatRanAJobSinceTheRequestRunsTheTaskIdleOnceItRanNoneForTheDelay() {
  RNSkIdleTaskSchedule schedule(kDelay, at(0));
  schedule.ranJob(at(10500));
  expect(!schedule.run(1, at(12000)),
         "a thread that ran a job since the request runs the task busy");
  expect(schedule.due(1, at(10000)) == at(12500),
         "then owes a run the delay after its last job");
  expect(schedule.run(1, at(12500)), "which it runs idle");
  expect(!schedule.due(1, at(10000)).has_value(), "then owes nothing");
}

void aThreadIsIdleExactlyTheDelayAfterItsLastJob() {
  RNSkIdleTaskSchedule schedule(kDelay, at(0));
  schedule.ranJob(at(10000) + kTick);
  expect(!schedule.run(1, at(12000)),
         "a job that ended one tick less than the delay before is recent");
  expect(schedule.run(1, at(12000) + kTick),
         "one that ended the delay before is not");
}

// The pool starts its threads on first use, which a request can be.
void aThreadStartedSinceTheRequestCountsItsStartAsItsLastJob() {
  RNSkIdleTaskSchedule schedule(kDelay, at(10500));
  expect(!schedule.run(1, at(12000)),
         "a thread started since the request runs the task busy");
  expect(schedule.due(1, at(10000)) == at(12500),
         "and owes a run the delay after its start");
}

void aThreadKeptBusyRunsTheTaskIdleOnceItsJobsStop() {
  RNSkIdleTaskSchedule schedule(kDelay, at(0));
  schedule.ranJob(at(11000));
  expect(!schedule.run(1, at(12000)),
         "a busy thread runs the task busy when it is due");
  schedule.ranJob(at(12500));
  expect(schedule.due(1, at(10000)) == at(14500),
         "each job puts the idle run off");
  schedule.ranJob(at(14000));
  expect(schedule.due(1, at(10000)) == at(16000), "until the jobs stop");
  expect(schedule.run(1, at(16000)),
         "the delay after the last job, the thread runs the task idle");
}

void requestsAddUp() {
  RNSkIdleTaskSchedule schedule(kDelay, at(0));
  expect(schedule.due(3, at(11000)) == at(13000),
         "the task is due the delay after the latest request");
  expect(schedule.run(3, at(13000)),
         "one run serves every request made before it");
  expect(!schedule.due(3, at(11000)).has_value(), "and leaves none to serve");
}

void aRequestPutsAnOwedIdleRunOffToItsOwnTime() {
  RNSkIdleTaskSchedule schedule(kDelay, at(0));
  schedule.ranJob(at(10500));
  expect(!schedule.run(1, at(12000)),
         "a thread that ran a job since the request runs the task busy");
  expect(schedule.due(2, at(12200)) == at(14200),
         "a request made since is due the delay after it");
  expect(schedule.run(2, at(14200)), "which runs the task idle, for both");
  expect(!schedule.due(2, at(12200)).has_value(), "and leaves nothing owed");
}

} // namespace

int main() {
  aThreadWithNoJobSinceTheRequestRunsTheTaskIdle();
  aThreadThatRanAJobSinceTheRequestRunsTheTaskIdleOnceItRanNoneForTheDelay();
  aThreadIsIdleExactlyTheDelayAfterItsLastJob();
  aThreadStartedSinceTheRequestCountsItsStartAsItsLastJob();
  aThreadKeptBusyRunsTheTaskIdleOnceItsJobsStop();
  requestsAddUp();
  aRequestPutsAnOwedIdleRunOffToItsOwnTime();
  if (failures > 0) {
    return 1;
  }
  std::printf("IdleTaskScheduleTest: passed\n");
  return 0;
}
