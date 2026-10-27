#pragma once

#include <chrono>
#include <cstdint>
#include <variant>

namespace RNSkia {

/**
 * When one thread of RNSkThreadPool runs the pool's idle task, and whether it
 * runs it idle (see RNSkThreadPool::requestIdleTask). The thread runs the
 * task the delay after the latest request it has not served, once no job is
 * waiting; idle when it ran no job for the delay. Requests add up: one run
 * serves every request made before it. A thread that ran a job meanwhile
 * runs the task busy, then owes it an idle run, which it runs once it ran no
 * job for the delay: the jobs of the views a request comes from can still be
 * running when it is made. The times are the caller's, so that the schedule
 * decides the same way for the same times.
 */
class RNSkIdleTaskSchedule {
public:
  using Clock = std::chrono::steady_clock;

  /** Nothing to run until a job or a request comes. */
  struct WaitForWork {};

  /** Nothing to run before `time`, unless a job comes. */
  struct WaitUntil {
    Clock::time_point time;
  };

  /** Run the idle task now; `idle`: the thread ran no job for the delay. */
  struct RunIdleTask {
    bool idle;
  };

  using Next = std::variant<WaitForWork, WaitUntil, RunIdleTask>;

  /** For a thread that starts at `start`, with no job run yet. */
  RNSkIdleTaskSchedule(Clock::duration delay, Clock::time_point start)
      : _delay(delay), _lastJob(start) {}

  /**
   What the thread does with no job waiting, at `now`: `requests` counts the
   requests made so far, the latest at `requestTime`.
   */
  Next next(uint64_t requests, Clock::time_point requestTime,
            Clock::time_point now) {
    Clock::time_point due;
    if (requests != _served) {
      due = requestTime + _delay;
    } else if (_idleRunOwed) {
      due = _lastJob + _delay;
    } else {
      return WaitForWork{};
    }
    if (now < due) {
      return WaitUntil{due};
    }
    _served = requests;
    const bool idle = now - _lastJob >= _delay;
    _idleRunOwed = !idle;
    return RunIdleTask{idle};
  }

  /** The thread finished a job at `now`. */
  void ranJob(Clock::time_point now) { _lastJob = now; }

private:
  const Clock::duration _delay;
  // The requests the thread served, whether it ran the task busy since it ran
  // it idle, and when it finished a job last.
  uint64_t _served = 0;
  bool _idleRunOwed = false;
  Clock::time_point _lastJob;
};

} // namespace RNSkia
