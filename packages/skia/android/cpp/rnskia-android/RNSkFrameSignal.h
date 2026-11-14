#pragma once

#include <android/choreographer.h>
#include <dlfcn.h>

#include <cstddef>
#include <cstdint>

#include "rnsurface/FrameClock.h"
#include "rnsurface/FrameScheduler.h"

namespace RNSkia {

/**
 * The frame signal of Android (see rnsurface::FrameScheduler::FrameSignal),
 * from the AChoreographer of the calling thread, which calls back on that
 * thread's looper.
 *
 * What a signal knows depends on the device. From API 33 on, the
 * choreographer hands out the frame timeline it expects the app to make:
 * when the frame started, when the compositor wakes up for it (the deadline)
 * and when it and the one after are shown (the interval). The entry points
 * are looked up at run time, as the library builds for API 26. Before that
 * there is no deadline to read: the signal says that it ends where it
 * starts, so that a frame only goes on a signal, as it did before the
 * scheduler knew of deadlines, and the interval is the time between two
 * signals in a row.
 */
class FrameSignalSource {
public:
  using FrameSignal = rnsurface::FrameScheduler::FrameSignal;
  using Callback = void (*)(const FrameSignal &signal, void *data);

  /**
   Has `callback(signal, data)` called at the next frame of the display, on
   the calling thread. Returns false when the thread has no choreographer
   (no connection to the display's events): nothing is posted then.
   */
  static bool post(Callback callback, void *data) {
    auto *choreographer = AChoreographer_getInstance();
    if (choreographer == nullptr) {
      return false;
    }
    auto *request = new Request{callback, data};
    const auto &entries = api();
    if (entries.postVsyncCallback != nullptr) {
      entries.postVsyncCallback(choreographer, onVsync, request);
    } else if (entries.postFrameCallback64 != nullptr) {
      entries.postFrameCallback64(choreographer, onFrame64, request);
    } else {
      // The entry point of API 24: its frame time is a long, 32 bits on a
      // 32-bit device, so the clock is read instead.
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
      AChoreographer_postFrameCallback(
          choreographer,
          [](long, void *data) {
            deliver(static_cast<Request *>(data), rnsurface::frameClockNow());
          },
          request);
#pragma clang diagnostic pop
    }
    return true;
  }

  /** A signal for a thread without a choreographer: a frame that starts now. */
  static FrameSignal unpaced() {
    const auto now = rnsurface::frameClockNow();
    return {now, kDefaultInterval, now};
  }

private:
  struct Request {
    Callback callback;
    void *data;
  };

  // The frame timeline of API 33 (android/choreographer.h), opaque here.
  struct FrameData;
  using VsyncCallback = void (*)(const FrameData *, void *);
  using FrameCallback64 = void (*)(int64_t, void *);

  struct Api {
    void (*postVsyncCallback)(AChoreographer *, VsyncCallback, void *);
    void (*postFrameCallback64)(AChoreographer *, FrameCallback64, void *);
    int64_t (*frameTime)(const FrameData *);
    size_t (*timelinesLength)(const FrameData *);
    size_t (*preferredTimeline)(const FrameData *);
    int64_t (*expectedPresentationTime)(const FrameData *, size_t);
    int64_t (*deadline)(const FrameData *, size_t);
  };

  template <typename Entry> static Entry lookUp(const char *name) {
    return reinterpret_cast<Entry>(dlsym(RTLD_DEFAULT, name));
  }

  static const Api &api() {
    static const Api entries = []() {
      Api found{};
      found.postFrameCallback64 = lookUp<decltype(found.postFrameCallback64)>(
          "AChoreographer_postFrameCallback64");
      found.frameTime = lookUp<decltype(found.frameTime)>(
          "AChoreographerFrameCallbackData_getFrameTimeNanos");
      found.timelinesLength = lookUp<decltype(found.timelinesLength)>(
          "AChoreographerFrameCallbackData_getFrameTimelinesLength");
      found.preferredTimeline = lookUp<decltype(found.preferredTimeline)>(
          "AChoreographerFrameCallbackData_getPreferredFrameTimelineIndex");
      found.expectedPresentationTime =
          lookUp<decltype(found.expectedPresentationTime)>(
              "AChoreographerFrameCallbackData_"
              "getFrameTimelineExpectedPresentationTimeNanos");
      found.deadline = lookUp<decltype(found.deadline)>(
          "AChoreographerFrameCallbackData_getFrameTimelineDeadlineNanos");
      // The timeline is all or nothing.
      if (found.frameTime != nullptr && found.timelinesLength != nullptr &&
          found.preferredTimeline != nullptr &&
          found.expectedPresentationTime != nullptr &&
          found.deadline != nullptr) {
        found.postVsyncCallback = lookUp<decltype(found.postVsyncCallback)>(
            "AChoreographer_postVsyncCallback");
      }
      return found;
    }();
    return entries;
  }

  // The time between two signals in a row is the display's interval; a
  // longer one is a stretch without signals, which says nothing about it.
  static int64_t intervalSince(int64_t time) {
    thread_local int64_t lastTime = 0;
    thread_local int64_t interval = kDefaultInterval;
    const int64_t elapsed = time - lastTime;
    lastTime = time;
    if (elapsed >= kShortestInterval && elapsed <= kLongestInterval) {
      interval = elapsed;
    }
    return interval;
  }

  static void onVsync(const FrameData *frame, void *data) {
    const auto &entries = api();
    FrameSignal signal;
    signal.time = entries.frameTime(frame);
    signal.interval = intervalSince(signal.time);
    const size_t timelines = entries.timelinesLength(frame);
    const size_t preferred = entries.preferredTimeline(frame);
    if (preferred < timelines) {
      // The compositor wakes up at the deadline, and takes what is there:
      // a frame a moment short of it may not be.
      signal.deadline = entries.deadline(frame, preferred) - kDeadlineMargin;
      if (preferred + 1 < timelines) {
        const int64_t shown =
            entries.expectedPresentationTime(frame, preferred + 1) -
            entries.expectedPresentationTime(frame, preferred);
        if (shown >= kShortestInterval && shown <= kLongestInterval) {
          signal.interval = shown;
        }
      }
    } else {
      signal.deadline = signal.time;
    }
    finish(static_cast<Request *>(data), signal);
  }

  static void onFrame64(int64_t frameTime, void *data) {
    deliver(static_cast<Request *>(data), frameTime);
  }

  // A signal without a timeline: it ends where it starts.
  static void deliver(Request *request, int64_t time) {
    finish(request, {time, intervalSince(time), time});
  }

  static void finish(Request *request, const FrameSignal &signal) {
    const Request copy = *request;
    delete request;
    copy.callback(signal, copy.data);
  }

  // 60 Hz until the display says otherwise; the rates a display runs at
  // are between 240 Hz and 20 Hz.
  static constexpr int64_t kDefaultInterval = 16666667;
  static constexpr int64_t kShortestInterval = 4000000;
  static constexpr int64_t kLongestInterval = 50000000;
  static constexpr int64_t kDeadlineMargin = 500000;
};

} // namespace RNSkia
