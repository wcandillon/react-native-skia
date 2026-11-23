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
  expect(!schedule.due().has_value(), "a thread nothing asked owes no run");
  schedule.request(at(10000));
  expect(schedule.due() == at(12000), "a request is due the delay after it");
  expect(schedule.run(at(12000)),
         "a thread with no job since runs the task idle");
  expect(!schedule.due().has_value(),
         "a thread that ran the task idle owes nothing");
}

// Another view's frame, or the dropped view's own last job, ending after the
// request.
void aThreadThatRanAJobSinceTheRequestRunsTheTaskIdleOnceItRanNoneForTheDelay() {
  RNSkIdleTaskSchedule schedule(kDelay, at(0));
  schedule.request(at(10000));
  schedule.ranJob(at(10500));
  expect(!schedule.run(at(12000)),
         "a thread that ran a job since the request runs the task busy");
  expect(schedule.due() == at(12500),
         "then owes a run the delay after its last job");
  expect(schedule.run(at(12500)), "which it runs idle");
  expect(!schedule.due().has_value(), "then owes nothing");
}

void aThreadIsIdleExactlyTheDelayAfterItsLastJob() {
  RNSkIdleTaskSchedule schedule(kDelay, at(0));
  schedule.request(at(10000));
  schedule.ranJob(at(10000) + kTick);
  expect(!schedule.run(at(12000)),
         "a job that ended one tick less than the delay before is recent");
  expect(schedule.run(at(12000) + kTick),
         "one that ended the delay before is not");
}

// The pool starts its threads on first use, which a request can be.
void aThreadStartedSinceTheRequestCountsItsStartAsItsLastJob() {
  RNSkIdleTaskSchedule schedule(kDelay, at(10500));
  schedule.request(at(10000));
  expect(!schedule.run(at(12000)),
         "a thread started since the request runs the task busy");
  expect(schedule.due() == at(12500),
         "and owes a run the delay after its start");
}

void aThreadKeptBusyRunsTheTaskIdleOnceItsJobsStop() {
  RNSkIdleTaskSchedule schedule(kDelay, at(0));
  schedule.request(at(10000));
  schedule.ranJob(at(11000));
  expect(!schedule.run(at(12000)),
         "a busy thread runs the task busy when it is due");
  schedule.ranJob(at(12500));
  expect(schedule.due() == at(14500), "each job puts the idle run off");
  schedule.ranJob(at(14000));
  expect(schedule.due() == at(16000), "until the jobs stop");
  expect(schedule.run(at(16000)),
         "the delay after the last job, the thread runs the task idle");
}

void requestsAddUp() {
  RNSkIdleTaskSchedule schedule(kDelay, at(0));
  schedule.request(at(10000));
  schedule.request(at(10500));
  schedule.request(at(11000));
  expect(schedule.due() == at(12000),
         "the task is due the delay after the first request");
  expect(schedule.run(at(12000)),
         "one run serves every request made before it");
  expect(!schedule.due().has_value(), "and leaves none to serve");
}

// Canvases unmounting one after another, less than the delay apart: each
// request gets a run within the delay, however long they keep coming.
void requestsThatKeepComingDoNotPutTheRunOff() {
  RNSkIdleTaskSchedule schedule(kDelay, at(0));
  schedule.request(at(10000));
  schedule.request(at(11500));
  expect(schedule.due() == at(12000),
         "a later request does not put the run off");
  expect(schedule.run(at(12000)), "which serves both");
  schedule.request(at(13000));
  schedule.request(at(14500));
  expect(schedule.due() == at(15000),
         "the next run is due the delay after the first request since");
}

// A view dropped on another thread, or an image the cache let go of, while
// this one owes an idle run.
void aRequestDoesNotPutAnOwedIdleRunOff() {
  RNSkIdleTaskSchedule schedule(kDelay, at(0));
  schedule.request(at(10000));
  schedule.ranJob(at(10500));
  expect(!schedule.run(at(12000)),
         "a thread that ran a job since the request runs the task busy");
  schedule.request(at(12200));
  expect(schedule.due() == at(12500),
         "a request made since leaves the owed run due first");
  schedule.request(at(14000));
  expect(schedule.due() == at(12500), "however many requests come");
  expect(schedule.run(at(12500)), "which runs the task idle");
  expect(!schedule.due().has_value(), "and serves the requests too");
}

void aRequestComesFirstWhileTheThreadOwingARunKeepsRecording() {
  RNSkIdleTaskSchedule schedule(kDelay, at(0));
  schedule.request(at(10000));
  schedule.ranJob(at(10500));
  expect(!schedule.run(at(12000)),
         "a thread that ran a job since the request runs the task busy");
  schedule.ranJob(at(13000));
  schedule.request(at(12200));
  expect(schedule.due() == at(14200),
         "a request comes first while jobs put the owed run off");
  expect(!schedule.run(at(14200)), "and runs the task busy");
  expect(schedule.due() == at(15000), "the thread still owes the idle run");
}

} // namespace

int main() {
  aThreadWithNoJobSinceTheRequestRunsTheTaskIdle();
  aThreadThatRanAJobSinceTheRequestRunsTheTaskIdleOnceItRanNoneForTheDelay();
  aThreadIsIdleExactlyTheDelayAfterItsLastJob();
  aThreadStartedSinceTheRequestCountsItsStartAsItsLastJob();
  aThreadKeptBusyRunsTheTaskIdleOnceItsJobsStop();
  requestsAddUp();
  requestsThatKeepComingDoNotPutTheRunOff();
  aRequestDoesNotPutAnOwedIdleRunOff();
  aRequestComesFirstWhileTheThreadOwingARunKeepsRecording();
  if (failures > 0) {
    return 1;
  }
  std::printf("IdleTaskScheduleTest: passed\n");
  return 0;
}
