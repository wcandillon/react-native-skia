#pragma once

#include <android/looper.h>
#include <sys/timerfd.h>
#include <unistd.h>

#include <algorithm>
#include <cerrno>
#include <chrono>
#include <cstdint>
#include <functional>
#include <map>
#include <stdexcept>
#include <system_error>
#include <utility>

#include "RNSkPresentThread.h"
#include "rnsurface/ThreadChecker.h"

namespace RNSkia {

// Runs tasks on the present thread once their delay has passed, as a Java
// Handler's postDelayed did on the Java present thread: a timerfd on the
// thread's looper (see rnsurface::RenderThread), armed for the task due first.
// One for the process, as the thread is, made on that thread at its first post.
class PresentThreadTimer {
public:
  static PresentThreadTimer &getInstance() {
    // Never destroyed, like the thread whose looper watches it.
    static auto *instance = new PresentThreadTimer();
    return *instance;
  }

  // Runs the task once `delay` has passed, after the tasks due before it and
  // never on the spot. A task posted cannot be taken back. Present thread.
  void post(std::chrono::milliseconds delay, std::function<void()> task) {
    RNSURFACE_ASSERT_THREAD(presentThread().checker(),
                            "PresentThreadTimer::post");
    _tasks.emplace(Clock::now() + delay, std::move(task));
    arm();
  }

private:
  using Clock = std::chrono::steady_clock;

  PresentThreadTimer()
      : _timer(timerfd_create(CLOCK_MONOTONIC, TFD_CLOEXEC | TFD_NONBLOCK)) {
    if (_timer == -1) {
      throw std::system_error(errno, std::generic_category(), "timerfd_create");
    }
    const int added = ALooper_addFd(
        ALooper_forThread(), _timer, ALOOPER_POLL_CALLBACK, ALOOPER_EVENT_INPUT,
        [](int, int, void *data) {
          static_cast<PresentThreadTimer *>(data)->runDue();
          return 1;
        },
        this);
    if (added != 1) {
      close(_timer);
      throw std::runtime_error("PresentThreadTimer: ALooper_addFd failed");
    }
  }

  void runDue() {
    std::uint64_t expirations = 0;
    static_cast<void>(read(_timer, &expirations, sizeof(expirations)));
    const auto now = Clock::now();
    while (!_tasks.empty() && _tasks.begin()->first <= now) {
      auto task = std::move(_tasks.begin()->second);
      _tasks.erase(_tasks.begin());
      task();
    }
    arm();
  }

  // A timerfd given a zero time is disarmed, so a task already due waits a
  // nanosecond rather than never.
  void arm() {
    itimerspec next{};
    if (!_tasks.empty()) {
      const auto wait = std::max<std::chrono::nanoseconds>(
          _tasks.begin()->first - Clock::now(), std::chrono::nanoseconds(1));
      const auto seconds =
          std::chrono::duration_cast<std::chrono::seconds>(wait);
      next.it_value.tv_sec =
          static_cast<decltype(next.it_value.tv_sec)>(seconds.count());
      next.it_value.tv_nsec = static_cast<decltype(next.it_value.tv_nsec)>(
          (wait - seconds).count());
    }
    timerfd_settime(_timer, 0, &next, nullptr);
  }

  std::multimap<Clock::time_point, std::function<void()>> _tasks;
  int _timer;
};

} // namespace RNSkia
