#pragma once

#include <atomic>
#include <chrono>
#include <condition_variable>
#include <mutex>

namespace RNSkia {

/**
 * The GPU device's use by the frames: a recording thread snapping a frame
 * (which compiles the pipelines the frame needs, inline), the present
 * thread replaying and presenting one, an upload, a readback. What the
 * pipeline warmup stays behind (see RNSkPipelineWarmup), so that its
 * compiles do not run while a frame is made or shown. The frames mark their
 * work (see Scope), and the warmup compiles only once nothing is marked and
 * nothing was for a while (see waitForIdle): at most one compile, the one in
 * flight as a frame starts, runs beside a frame.
 */
class RNSkGpuActivity {
public:
  static RNSkGpuActivity &getInstance() {
    // Never destroyed: a frame may end while the process exits.
    static auto *instance = new RNSkGpuActivity();
    return *instance;
  }

  /** Marks GPU work for its scope. Any thread. */
  class Scope {
  public:
    Scope() { getInstance().begin(); }
    ~Scope() { getInstance().end(); }
    Scope(const Scope &) = delete;
    Scope &operator=(const Scope &) = delete;
  };

  /**
   Blocks until no work is marked and none has been for `idle`, or until
   `stop` is set, in which case it returns false. Any thread that marks no
   work itself. Before the first mark the device is idle: nothing has used
   it yet.
   */
  bool waitForIdle(std::chrono::steady_clock::duration idle,
                   const std::atomic<bool> &stop) {
    std::unique_lock<std::mutex> lock(_mutex);
    for (;;) {
      if (stop.load(std::memory_order_acquire)) {
        return false;
      }
      const auto now = std::chrono::steady_clock::now();
      if (_inFlight == 0 && now - _lastEnd >= idle) {
        return true;
      }
      // Woken when work ends, which restarts the idle time, or once that
      // time has passed; `stop` is looked at as often.
      const auto deadline = _inFlight == 0 ? _lastEnd + idle : now + idle;
      _condition.wait_until(lock, deadline);
    }
  }

  /**
   Whether no work is marked and none has been for `idle`, without waiting
   for it: for a thread that looks now and then, which waitForIdle would wake
   on every frame. Any thread.
   */
  bool isIdle(std::chrono::steady_clock::duration idle) {
    std::lock_guard<std::mutex> lock(_mutex);
    return _inFlight == 0 &&
           std::chrono::steady_clock::now() - _lastEnd >= idle;
  }

private:
  RNSkGpuActivity() = default;

  void begin() {
    std::lock_guard<std::mutex> lock(_mutex);
    _inFlight++;
  }

  void end() {
    {
      std::lock_guard<std::mutex> lock(_mutex);
      _inFlight--;
      _lastEnd = std::chrono::steady_clock::now();
    }
    _condition.notify_all();
  }

  std::mutex _mutex;
  std::condition_variable _condition;
  int _inFlight = 0;
  // When the last marked work ended; the epoch until any did.
  std::chrono::steady_clock::time_point _lastEnd{};
};

} // namespace RNSkia
