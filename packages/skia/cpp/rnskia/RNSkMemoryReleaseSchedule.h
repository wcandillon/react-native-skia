#pragma once

#include <algorithm>
#include <chrono>
#include <cstdint>
#include <variant>

namespace RNSkia {

/**
 * When DawnContext's memory release thread asks Dawn to give back the memory
 * it keeps until asked (see DawnContext::requestMemoryRelease): once a request
 * is owed and nothing was submitted for `idleTime`, in rounds `roundInterval`
 * apart while Dawn says more remains or has work in flight, up to `maxRounds`
 * such rounds from the last request. A submit before a round, or between its
 * decision and its run, puts the next round off until nothing was submitted
 * for `idleTime` again, and a GPU context busy when a round is due puts it off
 * for `idleTime`: a view drawing frames would allocate again what Dawn gave
 * up. A request made during a round runs a round of its own. The times are
 * the caller's, so that the schedule decides the same way for the same times.
 */
class RNSkMemoryReleaseSchedule {
public:
  using Clock = std::chrono::steady_clock;

  /** Nothing to release until a request comes. */
  struct WaitForRequest {};

  /** Nothing to release before `time`. */
  struct WaitUntil {
    Clock::time_point time;
  };

  /**
   Ask Dawn now, for the requests made so far (`request` counts them), unless
   something was submitted after `lastWork`, the last submit this decision
   saw.
   */
  struct RunRound {
    uint64_t request;
    Clock::time_point lastWork;
  };

  using Next = std::variant<WaitForRequest, WaitUntil, RunRound>;

  /** What a round found. */
  enum class Round {
    // Dawn gave back all it could.
    kDone,
    // Dawn says more remains once the GPU work in flight is done.
    kAgain,
    // The device had work in flight: nothing was asked.
    kDeviceBusy,
    // The GPU context was busy: nothing was asked.
    kContextBusy,
    // Something was submitted since the round was decided: nothing was asked.
    kWorkSubmitted,
  };

  RNSkMemoryReleaseSchedule(Clock::duration idleTime,
                            Clock::duration roundInterval, int maxRounds)
      : _idleTime(idleTime), _roundInterval(roundInterval),
        _maxRounds(maxRounds) {}

  /**
   A release was asked for. Returns whether nothing was owed before it: only
   then does the release's thread wait for a request rather than for a
   round's time, so the views going at once, each asking, wake it once. The
   rounds count from it again, as it hands Dawn more to give back.
   */
  bool requested() {
    const bool nothingOwed = _requests == _served;
    _requests++;
    _rounds = 0;
    return nothingOwed;
  }

  /**
   What the release's thread does about a release at `now`, the last work
   having been submitted at `lastWork`.
   */
  Next next(Clock::time_point lastWork, Clock::time_point now) const {
    if (_requests == _served) {
      return WaitForRequest{};
    }
    const auto due = std::max(lastWork + _idleTime, _nextRound);
    if (now < due) {
      return WaitUntil{due};
    }
    return RunRound{_requests, lastWork};
  }

  /** The round `next()` asked for ran at `now`, and found `round`. */
  void ranRound(const RunRound &run, Round round, Clock::time_point now) {
    switch (round) {
    case Round::kDone:
      finish(run);
      return;
    case Round::kAgain:
    case Round::kDeviceBusy:
      // Work in flight on the device is Dawn's own submit after a round, or
      // another user's, react-native-webgpu drawing on it, which no submit of
      // Skia's shows: counting its rounds from the last request, across the
      // stretches Skia's own work interrupts, bounds what a release costs that
      // user.
      if (++_rounds >= _maxRounds) {
        finish(run);
        return;
      }
      _nextRound = now + _roundInterval;
      return;
    case Round::kContextBusy:
      // The context lock is held for more than submits: a recorder made, an
      // offscreen surface.
      _nextRound = now + _idleTime;
      return;
    case Round::kWorkSubmitted:
      // next() puts the round off from that submit.
      return;
    }
  }

private:
  void finish(const RunRound &run) { _served = run.request; }

  const Clock::duration _idleTime;
  const Clock::duration _roundInterval;
  const int _maxRounds;
  // The requests made and the ones a finished release served, the rounds
  // since the last request in which Dawn said more remains or had work in
  // flight, and when the next round is due.
  uint64_t _requests = 0;
  uint64_t _served = 0;
  int _rounds = 0;
  Clock::time_point _nextRound;
};

} // namespace RNSkia
