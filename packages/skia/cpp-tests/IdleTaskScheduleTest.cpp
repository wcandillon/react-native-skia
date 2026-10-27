// Host-side check of RNSkia::RNSkIdleTaskSchedule, when a thread of the render
// pool runs the idle task and whether idle (see run.sh). The times are made
// up: each case says when the requests came and the thread's jobs ended.

#include <chrono>
#include <cstdio>
#include <variant>

#include "rnskia/RNSkIdleTaskSchedule.h"

namespace {

using RNSkia::RNSkIdleTaskSchedule;
using Clock = RNSkIdleTaskSchedule::Clock;
using Next = RNSkIdleTaskSchedule::Next;

constexpr auto kDelay = std::chrono::milliseconds(2000);

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

bool waitsForWork(const Next &next) {
  return std::holds_alternative<RNSkIdleTaskSchedule::WaitForWork>(next);
}

bool waitsUntil(const Next &next, Clock::time_point time) {
  const auto *wait = std::get_if<RNSkIdleTaskSchedule::WaitUntil>(&next);
  return wait != nullptr && wait->time == time;
}

bool runs(const Next &next, bool idle) {
  const auto *run = std::get_if<RNSkIdleTaskSchedule::RunIdleTask>(&next);
  return run != nullptr && run->idle == idle;
}

void aThreadWithNoJobSinceTheRequestRunsTheTaskIdle() {
  RNSkIdleTaskSchedule schedule(kDelay, at(0));
  expect(waitsForWork(schedule.next(0, at(0), at(1000))),
         "a thread nothing asked waits for work");
  expect(waitsUntil(schedule.next(1, at(10000), at(10000)), at(12000)),
         "a request is due the delay after it");
  expect(runs(schedule.next(1, at(10000), at(12000)), true),
         "a thread with no job since runs the task idle once it is due");
  expect(waitsForWork(schedule.next(1, at(10000), at(12001))),
         "a thread that ran the task idle owes nothing");
}

// The job of a view dropped with the request, which finds its producer gone,
// is a job like any other.
void aThreadThatRanAJobSinceTheRequestRunsTheTaskIdleOnceItRanNoneForTheDelay() {
  RNSkIdleTaskSchedule schedule(kDelay, at(0));
  schedule.ranJob(at(10500));
  expect(runs(schedule.next(1, at(10000), at(12000)), false),
         "a thread that ran a job since the request runs the task busy");
  expect(waitsUntil(schedule.next(1, at(10000), at(12000)), at(12500)),
         "then waits until it ran no job for the delay");
  expect(runs(schedule.next(1, at(10000), at(12500)), true),
         "and runs the task idle then");
  expect(waitsForWork(schedule.next(1, at(10000), at(12501))),
         "then owes nothing");
}

void aThreadKeptBusyRunsTheTaskIdleOnceItsJobsStop() {
  RNSkIdleTaskSchedule schedule(kDelay, at(0));
  schedule.ranJob(at(11000));
  expect(runs(schedule.next(1, at(10000), at(12000)), false),
         "a busy thread runs the task busy when it is due");
  schedule.ranJob(at(12500));
  expect(waitsUntil(schedule.next(1, at(10000), at(13000)), at(14500)),
         "each job puts the idle run off");
  schedule.ranJob(at(14000));
  expect(waitsUntil(schedule.next(1, at(10000), at(14500)), at(16000)),
         "until the jobs stop");
  expect(runs(schedule.next(1, at(10000), at(16000)), true),
         "the delay after the last job, the thread runs the task idle");
}

void requestsAddUp() {
  RNSkIdleTaskSchedule schedule(kDelay, at(0));
  expect(waitsUntil(schedule.next(3, at(11000), at(12000)), at(13000)),
         "the task is due the delay after the latest request");
  expect(runs(schedule.next(3, at(11000), at(13000)), true),
         "one run serves every request made before it");
  expect(waitsForWork(schedule.next(3, at(11000), at(13001))),
         "and leaves none to serve");
}

void aRequestPutsAnOwedIdleRunOffToItsOwnTime() {
  RNSkIdleTaskSchedule schedule(kDelay, at(0));
  schedule.ranJob(at(10500));
  expect(runs(schedule.next(1, at(10000), at(12000)), false),
         "a thread that ran a job since the request runs the task busy");
  expect(waitsUntil(schedule.next(2, at(12200), at(12300)), at(14200)),
         "a request made since is due the delay after it");
  expect(runs(schedule.next(2, at(12200), at(14200)), true),
         "which runs the task idle, for both");
  expect(waitsForWork(schedule.next(2, at(12200), at(14201))),
         "and leaves nothing owed");
}

} // namespace

int main() {
  aThreadWithNoJobSinceTheRequestRunsTheTaskIdle();
  aThreadThatRanAJobSinceTheRequestRunsTheTaskIdleOnceItRanNoneForTheDelay();
  aThreadKeptBusyRunsTheTaskIdleOnceItsJobsStop();
  requestsAddUp();
  aRequestPutsAnOwedIdleRunOffToItsOwnTime();
  if (failures > 0) {
    return 1;
  }
  std::printf("IdleTaskScheduleTest: passed\n");
  return 0;
}
