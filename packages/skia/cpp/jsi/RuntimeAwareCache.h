#pragma once

#include <jsi/jsi.h>

#include <atomic>
#include <cstdint>
#include <memory>
#include <mutex>
#include <unordered_map>
#include <utility>

#include "RuntimeLifecycleMonitor.h"

namespace RNJsi {

namespace jsi = facebook::jsi;

class BaseRuntimeAwareCache {
public:
  static void setMainJsRuntime(jsi::Runtime *rt) {
    // Atomic: hot reload rewrites this from the JS thread while worklet
    // runtime threads read it concurrently.
    _mainRuntime.store(rt, std::memory_order_release);
    // Every (re)installation of the native module starts a new generation.
    // Callers that hold process-wide state derived from the main runtime
    // (see StaticRuntimeAwareCache) must key their invalidation on this
    // counter and NOT on the runtime pointer: when the JS runtime is
    // destroyed and recreated in-process (expo-updates OTA apply,
    // DevSettings.reload) the new jsi::Runtime is frequently allocated at
    // the exact address of the freed one, so a pointer comparison cannot
    // tell a reload from the steady state.
    _mainRuntimeGeneration.fetch_add(1, std::memory_order_acq_rel);
  }
  static uint64_t getMainJsRuntimeGeneration() {
    return _mainRuntimeGeneration.load(std::memory_order_acquire);
  }
  static jsi::Runtime *getMainJsRuntime() {
    auto *rt = _mainRuntime.load(std::memory_order_acquire);
    assert(rt != nullptr && "Expected main Javascript runtime to be set in the "
                            "BaseRuntimeAwareCache class.");

    return rt;
  }

private:
  static std::atomic<jsi::Runtime *> _mainRuntime;
  static std::atomic<uint64_t> _mainRuntimeGeneration;
};

/**
 * Provides a way to keep data specific to a jsi::Runtime instance that gets
 * cleaned up when that runtime is destroyed. This is necessary because JSI does
 * not allow for its associated objects to be retained past the runtime
 * lifetime. If an object (e.g. jsi::Values or jsi::Function instances) is kept
 * after the runtime is torn down, its destructor (once it is destroyed
 * eventually) will result in a crash (JSI objects keep a pointer to memory
 * managed by the runtime, accessing that portion of the memory after runtime is
 * deleted is the root cause of that crash).
 *
 * In order to provide an efficient implementation that does not add an overhead
 * for the cases when only a single runtiome is used, which is the primary
 * usecase, the following assumption has been made: Only for secondary runtimes
 * we track destruction and clean up the store associated with that runtime. For
 * the first runtime we assume that the object holding the store is destroyed
 * prior to the destruction of that runtime.
 *
 * The above assumption makes it work without any overhead when only single
 * runtime is in use. Specifically, we don't perform any additional operations
 * related to tracking runtime lifecycle when only a single runtime is used.
 */
template <typename T>
class RuntimeAwareCache : public BaseRuntimeAwareCache,
                          public RuntimeLifecycleListener {

public:
  void onRuntimeDestroyed(jsi::Runtime *rt) override {
    if (getMainJsRuntime() != rt) {
      // We are removing a secondary runtime. This is invoked by
      // RuntimeLifecycleMonitor on the destroyed runtime's thread, which may
      // run concurrently with get() on another runtime's thread.
      std::lock_guard<std::mutex> lock(_secondaryCachesMutex);
      _secondaryRuntimeCaches.erase(rt);
    }
  }

  ~RuntimeAwareCache() {
    for (auto &cache : _secondaryRuntimeCaches) {
      RuntimeLifecycleMonitor::removeListener(
          *static_cast<jsi::Runtime *>(cache.first), this);
    }
  }

  T &get(jsi::Runtime &rt) {
    // We check if we're accessing the main runtime - this is the happy path
    // to avoid us having to lookup by runtime for caches that only has a single
    // runtime
    if (getMainJsRuntime() == &rt) {
      return _primaryCache;
    } else {
      // Guard the secondary map: it can be mutated concurrently by get()
      // on a worklet runtime's thread and by onRuntimeDestroyed() when
      // another secondary runtime is torn down. The main-runtime path above
      // stays lock-free. References into the map remain valid after the
      // lock is released (unordered_map never invalidates references on
      // insert/erase of other keys, and this runtime's entry can only be
      // erased from this runtime's own thread).
      std::lock_guard<std::mutex> lock(_secondaryCachesMutex);
      if (_secondaryRuntimeCaches.count(&rt) == 0) {
        // we only add listener when the secondary runtime is used, this assumes
        // that the secondary runtime is terminated first. This lets us avoid
        // additional complexity for the majority of cases when objects are not
        // shared between runtimes. Otherwise we'd have to register all objecrts
        // with the RuntimeMonitor as opposed to only registering ones that are
        // used in secondary runtime. Note that we can't register listener here
        // with the primary runtime as it may run on a separate thread.
        RuntimeLifecycleMonitor::addListener(rt, this);

        T cache;
        _secondaryRuntimeCaches.emplace(&rt, std::move(cache));
      }
      return _secondaryRuntimeCaches.at(&rt);
    }
  }

private:
  std::mutex _secondaryCachesMutex;
  std::unordered_map<void *, T> _secondaryRuntimeCaches;
  T _primaryCache;
};

} // namespace RNJsi
