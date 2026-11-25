#pragma once

#include <chrono>
#include <cstdint>
#include <functional>
#include <map>
#include <mutex>
#include <string>
#include <tuple>
#include <utility>

#include "utils/RNSkLog.h"

namespace RNSkia {

/**
 Failures that happen with no JS caller to throw to: a frame that cannot be
 replayed on a render thread, a recording Graphite rejects, an image that
 cannot be uploaded, a window surface that cannot be made. Like a WebGPU
 device's uncapturederror event, they reach JS as an `uncapturederror` event
 on Skia.gpu (see src/skia/core/UncapturedErrors.ts), on the React Native
 runtime, with the error of their name (see RNJsi::NamedError).

 report() is called from any thread. The sink, set by the manager of the
 React Native runtime (see RNSkManager), takes the error there; without one
 (no runtime yet, or torn down), the error goes to the native log. The same
 error from the same source is reported once a second at most: a failure
 that repeats on every frame does not flood the JS thread.
 */
class RNSkUncapturedErrors {
public:
  /** One failure: the name of its error, its message, where it happened. */
  struct Report {
    std::string name;
    std::string message;
    /** "render", "recorder", "submit" or "surface". */
    std::string source;
    /** The nativeID of the canvas concerned; -1 for none. */
    int64_t viewId = -1;
  };

  using Sink = std::function<void(const Report &)>;

  /** Sets where the reports go; an empty sink sends them to the native log. */
  static void setSink(Sink sink) {
    auto &state = getState();
    std::lock_guard<std::mutex> lock(state.mutex);
    state.sink = std::move(sink);
  }

  /** Reports a failure. Any thread. */
  static void report(std::string name, std::string message, std::string source,
                     int64_t viewId = -1) {
    Report entry{std::move(name), std::move(message), std::move(source),
                 viewId};
    Sink sink;
    {
      auto &state = getState();
      std::lock_guard<std::mutex> lock(state.mutex);
      if (!state.shouldReport(entry)) {
        return;
      }
      sink = state.sink;
    }
    if (sink) {
      sink(entry);
    } else {
      RNSkLogger::logToConsole("React Native Skia (" + entry.source +
                               "): " + entry.name + ": " + entry.message);
    }
  }

private:
  using Clock = std::chrono::steady_clock;
  static constexpr auto kRepeatInterval = std::chrono::seconds(1);

  struct State {
    std::mutex mutex;
    Sink sink;
    // When each error was last reported, to drop its repeats.
    std::map<std::tuple<std::string, std::string, std::string, int64_t>,
             Clock::time_point>
        lastReported;

    bool shouldReport(const Report &entry) {
      auto key = std::make_tuple(entry.name, entry.message, entry.source,
                                 entry.viewId);
      auto now = Clock::now();
      auto it = lastReported.find(key);
      if (it != lastReported.end() && now - it->second < kRepeatInterval) {
        return false;
      }
      // Bounded: the entries of errors that stopped are dropped in bulk.
      if (lastReported.size() > 256) {
        lastReported.clear();
      }
      lastReported[key] = now;
      return true;
    }
  };

  // Never destroyed: a render thread may report during process teardown.
  static State &getState() {
    static auto *state = new State();
    return *state;
  }
};

} // namespace RNSkia
