#pragma once

#include <chrono>
#include <exception>
#include <mutex>
#include <thread>

#include "RNDawnContext.h"
#include "RNSkThreadPool.h"
#include "utils/RNSkLog.h"

namespace RNSkia {

/**
 * Skia.purgeGpuResources(), which the platform also asks for when memory
 * runs low: gives the GPU memory nothing uses back to the system. Dawn keeps
 * the memory of disposed surfaces and images for reuse otherwise. What is
 * alive keeps its content and its caches.
 *
 * request() returns at once. The work runs on a thread of its own, started
 * by a request and gone once done; a request made while it runs is served
 * by one more run of the same thread, however many came in.
 *
 * One run:
 *   1. asks the render threads to trim their recorders (their idle task);
 *   2. has Dawn free what it can now (DawnContext::reduceMemoryUsage);
 *   3. does that once more after the render threads trimmed.
 */
class RNSkGpuPurge {
public:
  /** Any thread. Nothing happens before the GPU is first used. */
  static void request() noexcept {
    auto *context = DawnContext::peekInstance();
    if (context == nullptr) {
      return;
    }
    auto &state = getState();
    {
      std::lock_guard<std::mutex> lock(state.mutex);
      state.requested = true;
      if (state.running) {
        return;
      }
      state.running = true;
    }
    try {
      std::thread([context]() { runRequests(context); }).detach();
    } catch (const std::exception &e) {
      RNSkLogger::logToConsole("Purging GPU resources failed: %s", e.what());
      std::lock_guard<std::mutex> lock(state.mutex);
      state.running = false;
    }
  }

private:
  struct State {
    std::mutex mutex;
    // Whether the purge thread is alive.
    bool running = false;
    // Whether a request came in since the thread last started a run.
    bool requested = false;
  };

  // Never destroyed: a request may come while the process exits.
  static State &getState() noexcept {
    static auto *state = new State();
    return *state;
  }

  // The purge thread: runs until no request is left.
  static void runRequests(DawnContext *context) noexcept {
    auto &state = getState();
    for (;;) {
      {
        std::lock_guard<std::mutex> lock(state.mutex);
        if (!state.requested) {
          state.running = false;
          return;
        }
        state.requested = false;
      }
      RNSkThreadPool::getInstance().requestIdleTask();
      reduceMemoryUsage(context);
      // The render threads run their idle task kIdleDelay after the request.
      std::this_thread::sleep_for(RNSkThreadPool::kIdleDelay +
                                  std::chrono::milliseconds(500));
      reduceMemoryUsage(context);
    }
  }

  // Dawn frees what it can, again for as long as it says deletions are
  // pending on submitted work.
  static void reduceMemoryUsage(DawnContext *context) noexcept {
    constexpr int kMaxPasses = 10;
    for (int pass = 0; pass < kMaxPasses; pass++) {
#if defined(__APPLE__)
      // iOS refuses GPU work in the background: the purge goes on once the
      // app is back.
      DawnContext::waitForForeground();
#endif
      if (!context->reduceMemoryUsage()) {
        return;
      }
      std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
  }
};

} // namespace RNSkia
