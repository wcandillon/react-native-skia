#pragma once

#include <algorithm>
#include <chrono>
#include <cstdint>
#include <variant>

namespace RNSkia {

/**
 * When DawnContext's memory release thread asks Dawn to give back the memory
 * it keeps until asked (see DawnContext::requestMemoryRelease): once a request
 * is owed and the frames left the GPU idle for `idleTime` (see
 * RNSkGpuActivity), in rounds `roundInterval` apart while Dawn says more
 * remains or has work in flight, up to `maxRounds` such rounds decided after
 * the last request. Past them, Dawn saying more remains ends the release, and
 * work in flight puts the next round off for `idleTime`, the release still
 * owed. The frames' work before a round, or between its decision and its
 * run, puts the next round off until they left the GPU idle for `idleTime`
 * again, and a GPU context busy when a round is due puts it off for
 * `idleTime`: a view drawing frames would allocate again what Dawn gave up. A
 * request made during a round runs a round of its own. The times are the
 * caller's: the same calls at the same times get the same decisions.
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
   the frames used the GPU after `lastWork`, their last use this decision
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
    // The frames used the GPU since the round was decided: nothing was asked.
    kGpuUsed,
  };

  RNSkMemoryReleaseSchedule(Clock::duration idleTime,
                            Clock::duration roundInterval, int maxRounds)
      : _idleTime(idleTime), _roundInterval(roundInterval),
        _maxRounds(maxRounds) {}

  /**
   A release was asked for. Returns whether nothing was owed before it: only
   then does the release's thread wait for a request rather than for a
   round's time, so the views going at once, each asking, wake it once. The
   rounds decided after it count from none, as it hands Dawn more to give
   back.
   */
  bool requested() {
    const bool nothingOwed = _requests == _served;
    _requests++;
    _rounds = 0;
    return nothingOwed;
  }

  /**
   What the release's thread does about a release at `now`, the frames
   having last used the GPU at `lastWork`, which is `now` while they use it.
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
      // Work in flight the frames' use does not show is Dawn's own submit
      // after a round, react-native-webgpu drawing on the device, or Skia's
      // submissions Dawn holds while an iOS app is in the background. Past
      // the most rounds, across the stretches the frames interrupt, Dawn
      // saying more remains ends the release, as each time costs
      // react-native-webgpu what its next frames allocate again, and a device
      // still busy is looked at once per idle time until it is free.
      if (run.request == _requests) {
        _rounds = std::min(_rounds + 1, _maxRounds);
      }
      if (_rounds < _maxRounds) {
        _nextRound = now + _roundInterval;
      } else if (round == Round::kAgain) {
        finish(run);
      } else {
        _nextRound = now + _idleTime;
      }
      return;
    case Round::kContextBusy:
      // The context lock is held for more than the frames' work, which next()
      // sees: a recorder made, a render thread's trim, the device replaced.
      _nextRound = now + _idleTime;
      return;
    case Round::kGpuUsed:
      // next() puts the round off from that use.
      return;
    }
  }

private:
  void finish(const RunRound &run) { _served = run.request; }

  const Clock::duration _idleTime;
  const Clock::duration _roundInterval;
  const int _maxRounds;
  // The requests made and the ones a finished release served, the rounds
  // decided since the last request in which Dawn said more remains or had
  // work in flight, up to the most, and when the next round is due.
  uint64_t _requests = 0;
  uint64_t _served = 0;
  int _rounds = 0;
  Clock::time_point _nextRound;
};

} // namespace RNSkia
