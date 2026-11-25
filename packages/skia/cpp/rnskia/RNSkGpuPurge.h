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
 * Skia.purgeGpuResources(), which the system also brings about when it is
 * short of memory and, on Android, when the app goes to the background:
 * gives the GPU memory nothing uses back to the system. Dawn keeps the
 * memory of disposed surfaces and images for reuse otherwise. What is alive
 * keeps its content and its caches.
 *
 * The platform only reports what the system said (onMemoryWarning,
 * onLowMemory, onTrimMemory): whether it calls for a purge is decided here.
 *
 * request() returns at once. The work runs on a thread of its own, started
 * by a request and gone once done; a request made while it runs is served
 * by one more run of the same thread, however many came in.
 *
 * One run:
 *   1. asks the render threads to free what their recorders hold (their
 *      idle task, see RNSkGraphiteProducer);
 *   2. has Dawn free what it can now (DawnContext::reduceMemoryUsage);
 *   3. does that once more after the render threads did.
 */
class RNSkGpuPurge {
public:
  /**
   Skia.purgeGpuResources(), after the caller purged its own recorders. Any
   thread. Nothing happens before the GPU is first used.
   */
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

  /**
   iOS, UIApplicationDidReceiveMemoryWarningNotification: the system is short
   of memory, and ends the apps that hold the most of it first. Any thread.
   */
  static void onMemoryWarning() noexcept { request(); }

  /**
   Android, ComponentCallbacks.onLowMemory(): the whole system is short of
   memory. Any thread.
   */
  static void onLowMemory() noexcept { request(); }

  /**
   Android, ComponentCallbacks2.onTrimMemory(): purges from
   kTrimMemoryUiHidden, which is each time the app goes to the background.
   Any thread.
   */
  static void onTrimMemory(int level) noexcept {
    if (level >= kTrimMemoryUiHidden) {
      request();
    }
  }

private:
  /**
   A round of passes asks Dawn again for as long as it says deletions are
   pending on submitted work, this many times at most and this far apart:
   about a second in all.
   */
  static constexpr int kMaxPasses = 10;
  static constexpr std::chrono::milliseconds kPassInterval{100};

  /**
   How long a run waits for the render threads between its two rounds of
   passes: they run their idle task RNSkThreadPool::kIdleDelay after the
   request, and what they free reaches Dawn shortly after.
   */
  static constexpr std::chrono::milliseconds kRenderThreadsDelay =
      std::chrono::milliseconds(RNSkThreadPool::kIdleDelay) +
      std::chrono::milliseconds(500);

  /**
   ComponentCallbacks2.TRIM_MEMORY_UI_HIDDEN: the app is no longer visible.
   It draws nothing there, and the system ends the processes in the
   background that hold the most memory first. The system sends it each time
   the app leaves the foreground, and it may be all it sends:
   TRIM_MEMORY_BACKGROUND did not come to an app left in the background
   until it was cached and frozen (a Samsung on Android 17). The levels
   below this one are for an app in the foreground, and are no longer sent
   since Android 14.
   */
  static constexpr int kTrimMemoryUiHidden = 20;

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
      run(context);
    }
  }

  // One run (see the class).
  static void run(DawnContext *context) noexcept {
    RNSkThreadPool::getInstance().requestIdleTask();
    runPasses(context);
    std::this_thread::sleep_for(kRenderThreadsDelay);
    runPasses(context);
  }

  // One round of passes: Dawn frees what it can, again for as long as it
  // says deletions are pending on submitted work.
  static void runPasses(DawnContext *context) noexcept {
    for (int pass = 0; pass < kMaxPasses; pass++) {
#if defined(__APPLE__)
      // iOS refuses GPU work in the background: the purge goes on once the
      // app is back.
      DawnContext::waitForForeground();
#endif
      if (!context->reduceMemoryUsage()) {
        return;
      }
      std::this_thread::sleep_for(kPassInterval);
    }
  }
};

} // namespace RNSkia
