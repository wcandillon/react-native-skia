// Host-side check of RNSkia::RNSkMemoryReleaseSchedule, when DawnContext's
// memory release thread asks Dawn to give back the memory it keeps until
// asked (see run.sh).
// The times are made up: each case says when work was last submitted, when
// the release was asked for and what each round found.

#include <chrono>
#include <cstdio>
#include <optional>
#include <variant>

#include "rnskia/RNSkMemoryReleaseSchedule.h"

namespace {

using RNSkia::RNSkMemoryReleaseSchedule;
using Clock = RNSkMemoryReleaseSchedule::Clock;
using Next = RNSkMemoryReleaseSchedule::Next;
using Round = RNSkMemoryReleaseSchedule::Round;
using RunRound = RNSkMemoryReleaseSchedule::RunRound;

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

// A copy, so that a round taken from a temporary outlives it.
std::optional<RunRound> runsRound(const Next &next) {
  const auto *round = std::get_if<RunRound>(&next);
  if (round == nullptr) {
    return std::nullopt;
  }
  return *round;
}

void aRequestAfterTheIdleTimeRunsARoundAtOnce() {
  auto schedule = makeSchedule();
  expect(waitsForRequest(schedule.next(at(0), at(5000))),
         "nothing is released before a request");
  schedule.requested();
  const auto round = runsRound(schedule.next(at(0), at(5000)));
  expect(round.has_value(), "a request once nothing was submitted for the idle "
                            "time runs a round at once");
  if (round.has_value()) {
    schedule.ranRound(*round, Round::kDone, at(5001));
  }
  expect(waitsForRequest(schedule.next(at(0), at(5002))),
         "a release Dawn finished leaves nothing owed");
}

// A view drawing frames meanwhile would allocate again what Dawn gave up.
void aRequestRightAfterASubmitWaitsForTheIdleTime() {
  auto schedule = makeSchedule();
  schedule.requested();
  expect(waitsUntil(schedule.next(at(10000), at(10100)), at(11000)),
         "a request right after a submit waits for the idle time");
  expect(waitsUntil(schedule.next(at(10900), at(11000)), at(11900)),
         "work meanwhile puts the release off again");
  expect(runsRound(schedule.next(at(10900), at(11900))).has_value(),
         "the release runs once nothing was submitted for the idle time");
}

void dawnSayingMoreRemainsRunsRoundsApartUpToTheLimit() {
  auto schedule = makeSchedule();
  schedule.requested();
  auto now = 5000;
  for (int attempt = 1; attempt <= kMaxRounds; attempt++) {
    const auto round = runsRound(schedule.next(at(0), at(now)));
    expect(round.has_value(), "each round runs once it is due");
    if (!round.has_value()) {
      return;
    }
    schedule.ranRound(*round, Round::kAgain, at(now));
    if (attempt < kMaxRounds) {
      expect(
          waitsUntil(schedule.next(at(0), at(now)), at(now) + kRoundInterval),
          "Dawn saying more remains asks again the round interval later");
    }
    now += 10;
  }
  expect(waitsForRequest(schedule.next(at(0), at(now))),
         "the release gives up after the most rounds");
}

void aReleaseAfterOneThatRanItsMostRoundsGetsThemAll() {
  auto schedule = makeSchedule();
  schedule.requested();
  auto now = 5000;
  for (int attempt = 0; attempt < kMaxRounds; attempt++) {
    const auto round = runsRound(schedule.next(at(0), at(now)));
    expect(round.has_value(), "each round of the first release runs");
    if (!round.has_value()) {
      return;
    }
    schedule.ranRound(*round, Round::kAgain, at(now));
    now += 10;
  }
  schedule.requested();
  for (int attempt = 1; attempt < kMaxRounds; attempt++) {
    const auto round = runsRound(schedule.next(at(0), at(now)));
    expect(round.has_value(), "each round of the next release runs");
    if (!round.has_value()) {
      return;
    }
    schedule.ranRound(*round, Round::kAgain, at(now));
    expect(waitsUntil(schedule.next(at(0), at(now)), at(now) + kRoundInterval),
           "the next release counts its rounds from none");
    now += 10;
  }
}

// A view gone between two rounds hands Dawn more to give back.
void aRequestBetweenRoundsGetsEveryRound() {
  auto schedule = makeSchedule();
  schedule.requested();
  auto now = 5000;
  for (int attempt = 1; attempt < kMaxRounds; attempt++) {
    const auto round = runsRound(schedule.next(at(0), at(now)));
    expect(round.has_value(), "each round before the request runs");
    if (!round.has_value()) {
      return;
    }
    schedule.ranRound(*round, Round::kAgain, at(now));
    now += 10;
  }
  expect(!schedule.requested(), "a request between rounds joins the release");
  for (int attempt = 1; attempt <= kMaxRounds; attempt++) {
    const auto round = runsRound(schedule.next(at(0), at(now)));
    expect(round.has_value(), "the request gets every round");
    if (!round.has_value()) {
      return;
    }
    schedule.ranRound(*round, Round::kAgain, at(now));
    now += 10;
  }
  expect(waitsForRequest(schedule.next(at(0), at(now))),
         "the release ends the most rounds after the last request");
}

void workBetweenRoundsPutsTheNextOneOff() {
  auto schedule = makeSchedule();
  schedule.requested();
  const auto round = runsRound(schedule.next(at(0), at(5000)));
  expect(round.has_value(),
         "the first round runs once nothing was submitted for the idle time");
  if (!round.has_value()) {
    return;
  }
  schedule.ranRound(*round, Round::kAgain, at(5000));
  expect(waitsUntil(schedule.next(at(5005), at(5010)), at(6005)),
         "work between two rounds puts the next one off for the idle time");
}

// A frame submitted after a round was decided, before the round took the
// context lock: Dawn asked then would give up what the next frames allocate
// again. However often it happens, the release stays owed and counts no
// round.
void workAfterTheDecisionPutsTheRoundOffFromThatWork() {
  auto schedule = makeSchedule();
  schedule.requested();
  auto lastWork = at(0);
  auto now = at(5000);
  for (int attempt = 0; attempt < kMaxRounds + 2; attempt++) {
    const auto round = runsRound(schedule.next(lastWork, now));
    expect(round.has_value() && round->lastWork == lastWork,
           "a round carries the last submit it was decided on");
    if (!round.has_value()) {
      return;
    }
    lastWork = now + std::chrono::milliseconds(1);
    const auto ran = now + std::chrono::milliseconds(400);
    schedule.ranRound(*round, Round::kWorkSubmitted, ran);
    expect(waitsUntil(schedule.next(lastWork, ran), lastWork + kIdleTime),
           "work after the decision puts the round off from that work");
    now = lastWork + kIdleTime;
  }
  const auto round = runsRound(schedule.next(lastWork, now));
  expect(round.has_value(),
         "the release runs once nothing was submitted for the idle time");
  if (round.has_value()) {
    schedule.ranRound(*round, Round::kDone, now);
  }
  expect(waitsForRequest(schedule.next(lastWork, now)),
         "a release Dawn finished leaves nothing to run");
}

// Work in flight on the device right after a round is Dawn's own submit, and
// any other is react-native-webgpu's, which no submit of Skia's shows: the
// round is asked again the round interval later, and counts, so that a device
// another user keeps busy ends the release after the most rounds.
void aDeviceBusyRoundIsAskedAgainSoonAndCounts() {
  auto schedule = makeSchedule();
  schedule.requested();
  auto now = 5000;
  for (int attempt = 1; attempt <= kMaxRounds; attempt++) {
    const auto round = runsRound(schedule.next(at(0), at(now)));
    expect(round.has_value(), "each round a busy device put off runs");
    if (!round.has_value()) {
      return;
    }
    schedule.ranRound(*round, Round::kDeviceBusy, at(now));
    if (attempt < kMaxRounds) {
      expect(
          waitsUntil(schedule.next(at(0), at(now)), at(now) + kRoundInterval),
          "a busy device is asked again the round interval later");
    }
    now += 10;
  }
  expect(waitsForRequest(schedule.next(at(0), at(now))),
         "a device busy round after round ends the release after the most");
}

// The context lock is held for more than submits (a recorder made, an
// offscreen surface): a context busy when a round is due is in use, and puts
// the release off as a submit does, however long it stays busy.
void aBusyContextPutsTheReleaseOffAsWorkDoes() {
  auto schedule = makeSchedule();
  schedule.requested();
  auto now = at(5000);
  for (int attempt = 0; attempt < kMaxRounds + 2; attempt++) {
    const auto round = runsRound(schedule.next(at(0), now));
    expect(round.has_value(), "the release a busy context put off runs");
    if (!round.has_value()) {
      return;
    }
    schedule.ranRound(*round, Round::kContextBusy, now);
    expect(waitsUntil(schedule.next(at(0), now), now + kIdleTime),
           "a busy context puts the next round off for the idle time");
    now += kIdleTime;
  }
  const auto round = runsRound(schedule.next(at(0), now));
  expect(round.has_value(), "the release runs once the context is free");
  if (round.has_value()) {
    schedule.ranRound(*round, Round::kDone, now);
  }
  expect(waitsForRequest(schedule.next(at(0), now)),
         "a release Dawn finished leaves nothing to run");
}

// The views of a screen going at once each ask: the release's thread, waiting
// for a round's time once one is owed, needs waking for the first alone.
void aRequestWakesTheThreadOnlyWhenNothingWasOwed() {
  auto schedule = makeSchedule();
  expect(schedule.requested(),
         "the first request finds nothing owed and wakes the thread");
  expect(!schedule.requested() && !schedule.requested(),
         "requests while one is owed leave the thread waiting");
  const auto round = runsRound(schedule.next(at(0), at(5000)));
  expect(round.has_value(), "the requests owed run a round");
  if (round.has_value()) {
    schedule.ranRound(*round, Round::kDone, at(5001));
  }
  expect(schedule.requested(),
         "a request after a finished release wakes the thread again");
}

void aRequestDuringARoundIsServedByARoundOfItsOwn() {
  auto schedule = makeSchedule();
  schedule.requested();
  const auto round = runsRound(schedule.next(at(0), at(5000)));
  expect(round.has_value(), "the first request runs a round");
  if (!round.has_value()) {
    return;
  }
  schedule.requested();
  schedule.ranRound(*round, Round::kDone, at(5002));
  expect(runsRound(schedule.next(at(0), at(5002))).has_value(),
         "a request made during a round runs a round of its own");
}

} // namespace

int main() {
  aRequestAfterTheIdleTimeRunsARoundAtOnce();
  aRequestRightAfterASubmitWaitsForTheIdleTime();
  dawnSayingMoreRemainsRunsRoundsApartUpToTheLimit();
  aReleaseAfterOneThatRanItsMostRoundsGetsThemAll();
  aRequestBetweenRoundsGetsEveryRound();
  workBetweenRoundsPutsTheNextOneOff();
  workAfterTheDecisionPutsTheRoundOffFromThatWork();
  aBusyContextPutsTheReleaseOffAsWorkDoes();
  aDeviceBusyRoundIsAskedAgainSoonAndCounts();
  aRequestWakesTheThreadOnlyWhenNothingWasOwed();
  aRequestDuringARoundIsServedByARoundOfItsOwn();
  if (failures > 0) {
    return 1;
  }
  std::printf("MemoryReleaseScheduleTest: passed\n");
  return 0;
}
