#pragma once

#include <algorithm>
#include <chrono>
#include <cstdint>
#include <variant>

namespace RNSkia {

/**
 * When DawnContext's poller asks Dawn to give back the memory it keeps for
 * reuse (see DawnContext::requestMemoryRelease): once the device ran no work
 * for `idleTime` since a request, in rounds `roundInterval` apart while Dawn
 * says more remains, up to `maxRounds` of them. Work on the device, or a GPU
 * context busy when a round is due, puts the next round off until it ran none
 * for `idleTime` again: a view drawing frames would allocate again what Dawn
 * gave up. A request made during a round runs a round of its own. The times
 * are the caller's, so that the schedule decides the same way for the same
 * times.
 */
class RNSkMemoryReleaseSchedule {
public:
  using Clock = std::chrono::steady_clock;

  /** Nothing to release until a request comes. */
  struct WaitForRequest {};

  /** Nothing to release before `time`, unless a request comes. */
  struct WaitUntil {
    Clock::time_point time;
  };

  /** Ask Dawn now, for the requests made so far: `request` counts them. */
  struct RunRound {
    uint64_t request;
  };

  using Next = std::variant<WaitForRequest, WaitUntil, RunRound>;

  /** What a round found. */
  enum class Round {
    // Dawn gave back all it could.
    kDone,
    // Dawn says more remains once the GPU work in flight is done.
    kAgain,
    // The GPU context was busy: nothing was asked.
    kBusy,
  };

  RNSkMemoryReleaseSchedule(Clock::duration idleTime,
                            Clock::duration roundInterval, int maxRounds)
      : _idleTime(idleTime), _roundInterval(roundInterval),
        _maxRounds(maxRounds) {}

  /** A release was asked for. */
  void requested() { _requests++; }

  /**
   What the poller does about a release at `now`, the device having last run
   work at `lastWork`.
   */
  Next next(Clock::time_point lastWork, Clock::time_point now) const {
    if (_requests == _served) {
      return WaitForRequest{};
    }
    const auto due = std::max(lastWork + _idleTime, _nextRound);
    if (now < due) {
      return WaitUntil{due};
    }
    return RunRound{_requests};
  }

  /** The round `next()` asked for ran at `now`, and found `round`. */
  void ranRound(const RunRound &run, Round round, Clock::time_point now) {
    switch (round) {
    case Round::kDone:
      finish(run);
      return;
    case Round::kAgain:
      if (++_rounds >= _maxRounds) {
        finish(run);
        return;
      }
      _nextRound = now + _roundInterval;
      return;
    case Round::kBusy:
      // The context lock is held for more than submits: a recorder made, an
      // offscreen surface.
      _nextRound = now + _idleTime;
      return;
    }
  }

private:
  void finish(const RunRound &run) {
    _served = run.request;
    _rounds = 0;
    _nextRound = Clock::time_point();
  }

  const Clock::duration _idleTime;
  const Clock::duration _roundInterval;
  const int _maxRounds;
  // The requests made and the ones a finished release served, the rounds
  // Dawn said more remains in, and when the next round is due.
  uint64_t _requests = 0;
  uint64_t _served = 0;
  int _rounds = 0;
  Clock::time_point _nextRound;
};

} // namespace RNSkia
