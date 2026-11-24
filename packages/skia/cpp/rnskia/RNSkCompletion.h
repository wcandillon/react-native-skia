#pragma once

#include <atomic>
#include <chrono>
#include <optional>

#if defined(__linux__)
#include <poll.h>
#include <sys/eventfd.h>
#include <unistd.h>

#include <cerrno>
#include <cstdint>
#include <thread>
#else
#include <condition_variable>
#include <mutex>
#endif

namespace RNSkia {

/**
 A result completed once and waited for in slices of monotonic time: on
 Linux and Android an eventfd, as a timed condition variable follows the wall
 clock on Android before API 30.
 */
class RNSkCompletion {
public:
  RNSkCompletion() = default;
  ~RNSkCompletion() {
#if defined(__linux__)
    if (_event >= 0) {
      close(_event);
    }
#endif
  }

  RNSkCompletion(const RNSkCompletion &) = delete;
  RNSkCompletion &operator=(const RNSkCompletion &) = delete;

  void complete(bool result) {
    int expected = kPending;
    if (!_state.compare_exchange_strong(expected, result ? kTrue : kFalse,
                                        std::memory_order_acq_rel)) {
      return;
    }
#if defined(__linux__)
    if (_event >= 0) {
      const uint64_t one = 1;
      (void)write(_event, &one, sizeof(one));
    }
#else
    {
      std::lock_guard<std::mutex> lock(_mutex);
    }
    _condition.notify_all();
#endif
  }

  std::optional<bool> waitFor(std::chrono::milliseconds slice) {
    if (auto result = completed()) {
      return result;
    }
#if defined(__linux__)
    if (_event >= 0) {
      pollfd descriptor{_event, POLLIN, 0};
      (void)poll(&descriptor, 1, static_cast<int>(slice.count()));
    } else {
      std::this_thread::sleep_for(slice);
    }
#else
    std::unique_lock<std::mutex> lock(_mutex);
    _condition.wait_for(lock, slice,
                        [this]() { return completed().has_value(); });
#endif
    return completed();
  }

private:
  static constexpr int kPending = 0;
  static constexpr int kFalse = 1;
  static constexpr int kTrue = 2;

  std::optional<bool> completed() const {
    const int state = _state.load(std::memory_order_acquire);
    if (state == kPending) {
      return std::nullopt;
    }
    return state == kTrue;
  }

  std::atomic<int> _state{kPending};
#if defined(__linux__)
  const int _event = eventfd(0, EFD_CLOEXEC);
#else
  std::mutex _mutex;
  std::condition_variable _condition;
#endif
};

} // namespace RNSkia
