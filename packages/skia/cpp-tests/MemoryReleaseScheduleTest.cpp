// Host-side check of RNSkia::RNSkMemoryReleaseSchedule, when DawnContext's
// poller asks Dawn to give back the memory it keeps for reuse (see run.sh).
// The times are made up: each case says when the device last ran work, when
// the release was asked for and what each round found.

#include <chrono>
#include <cstdio>
#include <variant>

#include "rnskia/RNSkMemoryReleaseSchedule.h"

namespace {

using RNSkia::RNSkMemoryReleaseSchedule;
using Clock = RNSkMemoryReleaseSchedule::Clock;
using Next = RNSkMemoryReleaseSchedule::Next;
using Round = RNSkMemoryReleaseSchedule::Round;

constexpr auto kIdleTime = std::chrono::milliseconds(1000);
constexpr auto kRoundInterval = std::chrono::milliseconds(10);
constexpr int kMaxRounds = 3;

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

RNSkMemoryReleaseSchedule makeSchedule() {
  return RNSkMemoryReleaseSchedule(kIdleTime, kRoundInterval, kMaxRounds);
}

bool waitsForRequest(const Next &next) {
  return std::holds_alternative<RNSkMemoryReleaseSchedule::WaitForRequest>(
      next);
}

bool waitsUntil(const Next &next, Clock::time_point time) {
  const auto *wait = std::get_if<RNSkMemoryReleaseSchedule::WaitUntil>(&next);
  return wait != nullptr && wait->time == time;
}

const RNSkMemoryReleaseSchedule::RunRound *runsRound(const Next &next) {
  return std::get_if<RNSkMemoryReleaseSchedule::RunRound>(&next);
}

void aRequestOnAnIdleDeviceRunsARoundAtOnce() {
  auto schedule = makeSchedule();
  expect(waitsForRequest(schedule.next(at(0), at(5000))),
         "nothing is released before a request");
  schedule.requested();
  const auto next = schedule.next(at(0), at(5000));
  const auto *round = runsRound(next);
  expect(round != nullptr,
         "a request on a device idle for the idle time runs a round at once");
  if (round != nullptr) {
    schedule.ranRound(*round, Round::kDone, at(5001));
  }
  expect(waitsForRequest(schedule.next(at(0), at(5002))),
         "a release Dawn finished leaves nothing owed");
}

// A view drawing frames meanwhile would allocate again what Dawn gave up.
void aRequestWhileTheDeviceWorksWaitsUntilItRanNothingForTheIdleTime() {
  auto schedule = makeSchedule();
  schedule.requested();
  expect(waitsUntil(schedule.next(at(10000), at(10100)), at(11000)),
         "a request on a device that just ran work waits for the idle time");
  expect(waitsUntil(schedule.next(at(10900), at(11000)), at(11900)),
         "work meanwhile puts the release off again");
  expect(runsRound(schedule.next(at(10900), at(11900))) != nullptr,
         "the release runs once the device ran nothing for the idle time");
}

void dawnSayingMoreRemainsRunsRoundsApartUpToTheLimit() {
  auto schedule = makeSchedule();
  schedule.requested();
  auto now = 5000;
  for (int round = 1; round <= kMaxRounds; round++) {
    const auto next = schedule.next(at(0), at(now));
    const auto *run = runsRound(next);
    expect(run != nullptr, "each round runs once it is due");
    if (run == nullptr) {
      return;
    }
    schedule.ranRound(*run, Round::kAgain, at(now));
    if (round < kMaxRounds) {
      expect(
          waitsUntil(schedule.next(at(0), at(now)), at(now) + kRoundInterval),
          "Dawn saying more remains asks again the round interval later");
    }
    now += 10;
  }
  expect(waitsForRequest(schedule.next(at(0), at(now))),
         "the release gives up after the most rounds");
}

void workBetweenRoundsPutsTheNextOneOff() {
  auto schedule = makeSchedule();
  schedule.requested();
  const auto next = schedule.next(at(0), at(5000));
  const auto *round = runsRound(next);
  expect(round != nullptr, "the first round runs on an idle device");
  if (round == nullptr) {
    return;
  }
  schedule.ranRound(*round, Round::kAgain, at(5000));
  expect(waitsUntil(schedule.next(at(5005), at(5010)), at(6005)),
         "work between two rounds puts the next one off for the idle time");
}

// The context lock is held for more than submits (a recorder made, an
// offscreen surface): a context busy when a round is due is in use, and puts
// the release off as work on the device does, however long it stays busy.
void aBusyContextPutsTheReleaseOffAsWorkDoes() {
  auto schedule = makeSchedule();
  schedule.requested();
  auto now = at(5000);
  for (int attempt = 0; attempt < kMaxRounds + 2; attempt++) {
    const auto *round = runsRound(schedule.next(at(0), now));
    expect(round != nullptr, "the release a busy context put off runs");
    if (round == nullptr) {
      return;
    }
    schedule.ranRound(*round, Round::kBusy, now);
    expect(waitsUntil(schedule.next(at(0), now), now + kIdleTime),
           "a busy context puts the next round off for the idle time");
    now += kIdleTime;
  }
  const auto *round = runsRound(schedule.next(at(0), now));
  expect(round != nullptr, "the release runs once the context is free");
  if (round != nullptr) {
    schedule.ranRound(*round, Round::kDone, now);
  }
  expect(waitsForRequest(schedule.next(at(0), now)),
         "a release Dawn finished leaves nothing to run");
}

void aRequestDuringARoundIsServedByARoundOfItsOwn() {
  auto schedule = makeSchedule();
  schedule.requested();
  const auto first = schedule.next(at(0), at(5000));
  const auto *round = runsRound(first);
  expect(round != nullptr, "the first request runs a round");
  if (round == nullptr) {
    return;
  }
  const auto ran = *round;
  schedule.requested();
  schedule.ranRound(ran, Round::kDone, at(5002));
  expect(runsRound(schedule.next(at(0), at(5002))) != nullptr,
         "a request made during a round runs a round of its own");
}

} // namespace

int main() {
  aRequestOnAnIdleDeviceRunsARoundAtOnce();
  aRequestWhileTheDeviceWorksWaitsUntilItRanNothingForTheIdleTime();
  dawnSayingMoreRemainsRunsRoundsApartUpToTheLimit();
  workBetweenRoundsPutsTheNextOneOff();
  aBusyContextPutsTheReleaseOffAsWorkDoes();
  aRequestDuringARoundIsServedByARoundOfItsOwn();
  if (failures > 0) {
    return 1;
  }
  std::printf("MemoryReleaseScheduleTest: passed\n");
  return 0;
}
