#pragma once

/**
 * Benchmark counters and timers of the native recorder, compiled in with
 * RNSKIA_RECORDER_STATS (the example app sets it from its Podfile when
 * RNSKIA_RECORDER_STATS=1 is in the environment of `pod install`). Without
 * the define every macro below expands to nothing and nothing else in this
 * header is compiled: the counters sit on the hot path of every commit and
 * every frame.
 *
 * What is counted, per process, until reset():
 * - HostCalls: calls of the recorder's JSI host functions (JsiRecorder.h).
 * - HasProperty, GetProperty: property probes made by Convertor.h while
 *   converting props (array element reads are not property probes).
 * - CommandAllocs: Command objects allocated by the recorder.
 * - Conversions: shared value conversions (std::function) registered in
 *   Variables.
 * The probes made while a shared value is read (Recorder::readUpdates on the
 * UI thread, readSharedValues) are counted apart, as the mapper's, so that
 * the counters of a commit are the recording's alone.
 *
 * What is timed, in microseconds, as samples JS collects (see the stats
 * object installed on the React Native runtime as
 * globalThis.__RNSkiaRecorderStats, RNSkManager.cpp):
 * - ReadUpdates: Recorder::readUpdates, one sample per mapper run.
 * - Play: Recorder::play, one sample per frame, with the share of it spent
 *   in Shaders (the shader and gradient commands), Paths (PathCmd::play) and
 *   PaintCopies (the paint copies of Recorder::playCommand).
 * - CommandBufferPlay, CommandBufferPicture, CommandBufferRebuild: the
 *   experimental command buffer (api/experimental), interpreted and through
 *   a picture.
 * A frame's sub timers accumulate in thread local slots between beginFrame()
 * and endFrame(), so that the share is of the same frame.
 *
 * Aggregates are logged to the native console once per second at most, never
 * per frame.
 */

#ifdef RNSKIA_RECORDER_STATS

#include <algorithm>
#include <array>
#include <atomic>
#include <chrono>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <fstream>
#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

#include <jsi/jsi.h>

#include "utils/RNSkLog.h"

#if __has_include(<hermes/hermes.h>)
#include <hermes/hermes.h>
#define RNSKIA_RECORDER_STATS_HERMES_PROFILER 1
#endif

namespace RNSkia {

namespace jsi = facebook::jsi;

/**
 * Disables (or restores) the idle timer of the device, so that a benchmark
 * run is not interrupted by the screen locking. Implemented by the platform
 * (apple/RNSkApplePlatformContext.mm); a no-op elsewhere.
 */
void recorderStatsKeepAwake(bool on);

class RecorderStats {
public:
  enum Counter : int {
    HostCalls = 0,
    HasProperty,
    GetProperty,
    CommandAllocs,
    Conversions,
    CounterCount
  };

  enum Timer : int {
    ReadUpdates = 0,
    Play,
    Shaders,
    Paths,
    PaintCopies,
    CommandBufferPlay,
    CommandBufferPicture,
    CommandBufferRebuild,
    TimerCount
  };

  static constexpr std::array<const char *, CounterCount> kCounterNames = {
      "hostCalls", "hasProperty", "getProperty", "commandAllocs",
      "conversions"};

  static constexpr std::array<const char *, TimerCount> kTimerNames = {
      "readUpdates",
      "play",
      "shaders",
      "paths",
      "paintCopies",
      "commandBufferPlay",
      "commandBufferPicture",
      "commandBufferRebuild"};

  // The most recent samples kept per timer; older ones are dropped. A
  // benchmark reads them every few seconds.
  static constexpr size_t kMaxSamples = 4096;

  using Clock = std::chrono::steady_clock;

  /** Never destroyed: a frame may be timed during process teardown. */
  static RecorderStats &get() {
    static auto *instance = new RecorderStats();
    return *instance;
  }

  static double micros(Clock::time_point start) {
    return std::chrono::duration<double, std::micro>(Clock::now() - start)
        .count();
  }

  void count(Counter counter, uint64_t n = 1) {
    (reading() ? _mapperCounters : _counters)[counter].fetch_add(
        n, std::memory_order_relaxed);
  }

  /** Whether this thread is reading shared values (see ReadingScope). */
  static bool &reading() {
    thread_local bool flag = false;
    return flag;
  }

  /** Starts a frame on this thread: the sub timers start from zero. */
  static void beginFrame() { accumulators().fill(0.0); }

  /** Adds to a sub timer of the frame open on this thread. */
  static void accumulate(Timer timer, double micros) {
    accumulators()[timer] += micros;
  }

  /**
   * Ends the frame open on this thread: files `micros` as a sample of
   * `total` and the accumulated sub timers as samples of their own, then
   * logs the aggregates if a second passed since the last log.
   */
  void endFrame(Timer total, double totalMicros) {
    auto &slots = accumulators();
    {
      std::lock_guard<std::mutex> lock(_mutex);
      fileLocked(total, totalMicros);
      for (int i = 0; i < TimerCount; i++) {
        if (i == total) {
          continue;
        }
        // Only the sub timers of this frame's path: a slot that was never
        // touched during this frame says nothing about it.
        if (slots[i] > 0.0 || isSubTimerOf(total, static_cast<Timer>(i))) {
          fileLocked(static_cast<Timer>(i), slots[i]);
        }
      }
    }
    logIfDue();
  }

  /** A sample of a timer that is not frame scoped (ReadUpdates). */
  void sample(Timer timer, double micros) {
    {
      std::lock_guard<std::mutex> lock(_mutex);
      fileLocked(timer, micros);
    }
    logIfDue();
  }

  /** A sample of a timer JS measures (the mapper of a benchmark, say). */
  void sampleNamed(const std::string &name, double micros) {
    std::lock_guard<std::mutex> lock(_mutex);
    auto &samples = _named[name];
    push(samples, micros);
  }

  /** A frame of the view went to its window (RNSkView::presentFrame). */
  void framePresented(size_t nativeId) {
    std::lock_guard<std::mutex> lock(_mutex);
    _frames[nativeId]++;
  }

  uint64_t framesPresented(size_t nativeId) {
    std::lock_guard<std::mutex> lock(_mutex);
    auto it = _frames.find(nativeId);
    return it == _frames.end() ? 0 : it->second;
  }

  void reset() {
    std::lock_guard<std::mutex> lock(_mutex);
    for (auto &counter : _counters) {
      counter.store(0, std::memory_order_relaxed);
    }
    for (auto &counter : _mapperCounters) {
      counter.store(0, std::memory_order_relaxed);
    }
    for (auto &samples : _samples) {
      samples.clear();
    }
    for (auto &aggregate : _aggregates) {
      aggregate = {};
    }
    _named.clear();
    _frames.clear();
  }

  /**
   * The counters, the samples of every timer (microseconds, oldest first),
   * the named samples and the frames presented per view, as a JS object:
   * { counters: { hostCalls, ... }, mapperCounters: { hostCalls, ... },
   *   timers: { play: number[], ... }, named: { [name]: number[] },
   *   frames: { [nativeId]: number } }.
   */
  jsi::Value snapshot(jsi::Runtime &runtime) {
    std::lock_guard<std::mutex> lock(_mutex);
    jsi::Object result(runtime);
    jsi::Object counters(runtime);
    jsi::Object mapperCounters(runtime);
    for (int i = 0; i < CounterCount; i++) {
      counters.setProperty(
          runtime, kCounterNames[i],
          static_cast<double>(_counters[i].load(std::memory_order_relaxed)));
      mapperCounters.setProperty(runtime, kCounterNames[i],
                                 static_cast<double>(_mapperCounters[i].load(
                                     std::memory_order_relaxed)));
    }
    result.setProperty(runtime, "counters", counters);
    result.setProperty(runtime, "mapperCounters", mapperCounters);
    jsi::Object timers(runtime);
    for (int i = 0; i < TimerCount; i++) {
      timers.setProperty(runtime, kTimerNames[i],
                         toArray(runtime, _samples[i]));
    }
    result.setProperty(runtime, "timers", timers);
    jsi::Object named(runtime);
    for (const auto &[name, samples] : _named) {
      named.setProperty(runtime, name.c_str(), toArray(runtime, samples));
    }
    result.setProperty(runtime, "named", named);
    jsi::Object frames(runtime);
    for (const auto &[nativeId, count] : _frames) {
      frames.setProperty(runtime, std::to_string(nativeId).c_str(),
                         static_cast<double>(count));
    }
    result.setProperty(runtime, "frames", frames);
    return result;
  }

private:
  struct Aggregate {
    uint64_t count = 0;
    double sum = 0;
    double max = 0;
  };

  RecorderStats() : _lastLog(Clock::now()) {
    for (auto &counter : _counters) {
      counter.store(0, std::memory_order_relaxed);
    }
    for (auto &counter : _mapperCounters) {
      counter.store(0, std::memory_order_relaxed);
    }
  }

  static std::array<double, TimerCount> &accumulators() {
    thread_local std::array<double, TimerCount> slots{};
    return slots;
  }

  static bool isSubTimerOf(Timer total, Timer timer) {
    if (total == Play) {
      return timer == Shaders || timer == Paths || timer == PaintCopies;
    }
    if (total == CommandBufferPicture) {
      return timer == CommandBufferRebuild;
    }
    return false;
  }

  static void push(std::vector<double> &samples, double micros) {
    if (samples.size() >= kMaxSamples) {
      samples.erase(samples.begin(),
                    samples.begin() + static_cast<long>(kMaxSamples / 2));
    }
    samples.push_back(micros);
  }

  void fileLocked(Timer timer, double micros) {
    push(_samples[timer], micros);
    auto &aggregate = _aggregates[timer];
    aggregate.count++;
    aggregate.sum += micros;
    aggregate.max = std::max(aggregate.max, micros);
  }

  static jsi::Array toArray(jsi::Runtime &runtime,
                            const std::vector<double> &samples) {
    jsi::Array array(runtime, samples.size());
    for (size_t i = 0; i < samples.size(); i++) {
      array.setValueAtIndex(runtime, i, samples[i]);
    }
    return array;
  }

  /** Logs the aggregates since the last log, once per second at most. */
  void logIfDue() {
    std::array<Aggregate, TimerCount> aggregates;
    std::array<uint64_t, CounterCount> counters;
    std::array<uint64_t, CounterCount> mapperCounters;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      const auto now = Clock::now();
      if (now - _lastLog < std::chrono::seconds(1)) {
        return;
      }
      _lastLog = now;
      aggregates = _aggregates;
      for (auto &aggregate : _aggregates) {
        aggregate = {};
      }
      for (int i = 0; i < CounterCount; i++) {
        counters[i] = _counters[i].load(std::memory_order_relaxed);
        mapperCounters[i] = _mapperCounters[i].load(std::memory_order_relaxed);
      }
    }
    std::string line = "recorder stats:";
    for (int i = 0; i < TimerCount; i++) {
      const auto &aggregate = aggregates[i];
      if (aggregate.count == 0) {
        continue;
      }
      char buffer[128];
      snprintf(buffer, sizeof(buffer), " %s n=%llu mean=%.1fus max=%.1fus",
               kTimerNames[i], static_cast<unsigned long long>(aggregate.count),
               aggregate.sum / static_cast<double>(aggregate.count),
               aggregate.max);
      line += buffer;
    }
    for (int i = 0; i < CounterCount; i++) {
      char buffer[64];
      snprintf(buffer, sizeof(buffer), " %s=%llu", kCounterNames[i],
               static_cast<unsigned long long>(counters[i]));
      line += buffer;
    }
    for (int i = 0; i < CounterCount; i++) {
      char buffer[64];
      snprintf(buffer, sizeof(buffer), " mapper.%s=%llu", kCounterNames[i],
               static_cast<unsigned long long>(mapperCounters[i]));
      line += buffer;
    }
    RNSkLogger::logToConsole(line);
  }

  std::array<std::atomic<uint64_t>, CounterCount> _counters;
  std::array<std::atomic<uint64_t>, CounterCount> _mapperCounters;
  std::mutex _mutex;
  std::array<std::vector<double>, TimerCount> _samples;
  std::array<Aggregate, TimerCount> _aggregates;
  std::unordered_map<std::string, std::vector<double>> _named;
  std::unordered_map<size_t, uint64_t> _frames;
  Clock::time_point _lastLog;
};

/** Marks its scope as reading shared values (see RecorderStats::count). */
class RecorderStatsReadingScope {
public:
  RecorderStatsReadingScope() { RecorderStats::reading() = true; }
  ~RecorderStatsReadingScope() { RecorderStats::reading() = false; }
};

/** Adds the time of its scope to a sub timer of the frame on this thread. */
class RecorderStatsScope {
public:
  explicit RecorderStatsScope(RecorderStats::Timer timer)
      : _timer(timer), _start(RecorderStats::Clock::now()) {}
  ~RecorderStatsScope() {
    RecorderStats::accumulate(_timer, RecorderStats::micros(_start));
  }

private:
  RecorderStats::Timer _timer;
  RecorderStats::Clock::time_point _start;
};

/**
 * globalThis.__RNSkiaRecorderStats: the stats for a benchmark, on any
 * runtime (a HostObject travels between runtimes by reference):
 * - snapshot(): see RecorderStats::snapshot.
 * - reset(): zeroes the counters and drops the samples.
 * - addSample(name, micros): a sample JS timed (a worklet, say).
 * - framesPresented(nativeId): frames the view presented since reset().
 * - now(): a steady clock in milliseconds, the same on every runtime.
 * - log(message): to the native console (console.log is dropped by release
 *   builds).
 * - writeFile(name, text): writes a file into the app's Documents folder
 *   (pulled from a device with `xcrun devicectl device copy from`); returns
 *   its path.
 * - startProfiler(hz?), stopProfiler(name): the Hermes sampling profiler,
 *   process wide; stopProfiler writes the trace into the Documents folder
 *   and returns its path, or null when the profiler is not available in
 *   this build.
 * - keepAwake(on): disables the idle timer of the device, so that a run
 *   of several minutes is not cut short by the screen locking (iOS).
 */
class JsiRecorderStats : public jsi::HostObject {
public:
  jsi::Value get(jsi::Runtime &runtime, const jsi::PropNameID &name) override {
    auto prop = name.utf8(runtime);
    if (prop == "snapshot") {
      return function(runtime, prop, 0,
                      [](jsi::Runtime &rt, const jsi::Value *, size_t) {
                        return RecorderStats::get().snapshot(rt);
                      });
    }
    if (prop == "reset") {
      return function(runtime, prop, 0,
                      [](jsi::Runtime &, const jsi::Value *, size_t) {
                        RecorderStats::get().reset();
                        return jsi::Value::undefined();
                      });
    }
    if (prop == "addSample") {
      return function(
          runtime, prop, 2,
          [](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
            if (count >= 2 && args[0].isString() && args[1].isNumber()) {
              RecorderStats::get().sampleNamed(args[0].asString(rt).utf8(rt),
                                               args[1].asNumber());
            }
            return jsi::Value::undefined();
          });
    }
    if (prop == "framesPresented") {
      return function(runtime, prop, 1,
                      [](jsi::Runtime &, const jsi::Value *args, size_t count) {
                        if (count < 1 || !args[0].isNumber()) {
                          return jsi::Value(0);
                        }
                        return jsi::Value(static_cast<double>(
                            RecorderStats::get().framesPresented(
                                static_cast<size_t>(args[0].asNumber()))));
                      });
    }
    if (prop == "now") {
      return function(runtime, prop, 0,
                      [](jsi::Runtime &, const jsi::Value *, size_t) {
                        return jsi::Value(
                            std::chrono::duration<double, std::milli>(
                                RecorderStats::Clock::now().time_since_epoch())
                                .count());
                      });
    }
    if (prop == "log") {
      return function(
          runtime, prop, 1,
          [](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
            if (count >= 1 && args[0].isString()) {
              RNSkLogger::logToConsole(args[0].asString(rt).utf8(rt));
            }
            return jsi::Value::undefined();
          });
    }
    if (prop == "writeFile") {
      return function(
          runtime, prop, 2,
          [](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
            if (count < 2 || !args[0].isString() || !args[1].isString()) {
              return jsi::Value::null();
            }
            auto path = documentsPath(args[0].asString(rt).utf8(rt));
            std::ofstream file(path, std::ios::out | std::ios::trunc);
            if (!file) {
              return jsi::Value::null();
            }
            file << args[1].asString(rt).utf8(rt);
            return jsi::Value(rt, jsi::String::createFromUtf8(rt, path));
          });
    }
    if (prop == "keepAwake") {
      return function(runtime, prop, 1,
                      [](jsi::Runtime &, const jsi::Value *args, size_t count) {
                        recorderStatsKeepAwake(count < 1 || !args[0].isBool() ||
                                               args[0].getBool());
                        return jsi::Value::undefined();
                      });
    }
    if (prop == "startProfiler") {
      return function(runtime, prop, 1,
                      [](jsi::Runtime &, const jsi::Value *args, size_t count) {
#ifdef RNSKIA_RECORDER_STATS_HERMES_PROFILER
                        const double hz = count >= 1 && args[0].isNumber()
                                              ? args[0].asNumber()
                                              : 1000;
                        hermesRootAPI()->enableSamplingProfiler(hz);
                        return jsi::Value(true);
#else
            return jsi::Value(false);
#endif
                      });
    }
    if (prop == "stopProfiler") {
      return function(
          runtime, prop, 1,
          [](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
#ifdef RNSKIA_RECORDER_STATS_HERMES_PROFILER
            auto *api = hermesRootAPI();
            api->disableSamplingProfiler();
            if (count < 1 || !args[0].isString()) {
              return jsi::Value::null();
            }
            auto path = documentsPath(args[0].asString(rt).utf8(rt));
            api->dumpSampledTraceToFile(path);
            return jsi::Value(rt, jsi::String::createFromUtf8(rt, path));
#else
            return jsi::Value::null();
#endif
          });
    }
    return jsi::Value::undefined();
  }

  std::vector<jsi::PropNameID>
  getPropertyNames(jsi::Runtime &runtime) override {
    std::vector<jsi::PropNameID> names;
    for (const char *name :
         {"snapshot", "reset", "addSample", "framesPresented", "now", "log",
          "writeFile", "keepAwake", "startProfiler", "stopProfiler"}) {
      names.push_back(jsi::PropNameID::forAscii(runtime, name));
    }
    return names;
  }

private:
  template <typename F>
  static jsi::Value function(jsi::Runtime &runtime, const std::string &name,
                             unsigned int paramCount, F &&body) {
    return jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forUtf8(runtime, name), paramCount,
        [body = std::forward<F>(body)](
            jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args,
            size_t count) -> jsi::Value { return body(rt, args, count); });
  }

  /**
   * A file of the app's Documents folder ($HOME/Documents in the iOS
   * sandbox), or of the working directory without a HOME.
   */
  static std::string documentsPath(const std::string &name) {
    const char *home = std::getenv("HOME");
    if (home == nullptr) {
      return name;
    }
    return std::string(home) + "/Documents/" + name;
  }

#ifdef RNSKIA_RECORDER_STATS_HERMES_PROFILER
  static facebook::hermes::IHermesRootAPI *hermesRootAPI() {
    static auto *api = jsi::castInterface<facebook::hermes::IHermesRootAPI>(
        facebook::hermes::makeHermesRootAPI());
    return api;
  }
#endif
};

} // namespace RNSkia

#define RNSKIA_STAT_CONCAT_INNER(a, b) a##b
#define RNSKIA_STAT_CONCAT(a, b) RNSKIA_STAT_CONCAT_INNER(a, b)
#define RNSKIA_STAT_COUNT(counter)                                             \
  ::RNSkia::RecorderStats::get().count(::RNSkia::RecorderStats::counter)
#define RNSKIA_STAT_COUNT_N(counter, n)                                        \
  ::RNSkia::RecorderStats::get().count(::RNSkia::RecorderStats::counter, (n))
#define RNSKIA_STAT_SCOPE(timer)                                               \
  ::RNSkia::RecorderStatsScope RNSKIA_STAT_CONCAT(rnskiaStatScope, __LINE__)(  \
      ::RNSkia::RecorderStats::timer)
#define RNSKIA_STAT_READING_SCOPE()                                            \
  ::RNSkia::RecorderStatsReadingScope RNSKIA_STAT_CONCAT(rnskiaStatReading,    \
                                                         __LINE__)

#else // RNSKIA_RECORDER_STATS

#define RNSKIA_STAT_COUNT(counter) ((void)0)
#define RNSKIA_STAT_COUNT_N(counter, n) ((void)0)
#define RNSKIA_STAT_SCOPE(timer) ((void)0)
#define RNSKIA_STAT_READING_SCOPE() ((void)0)

#endif // RNSKIA_RECORDER_STATS
