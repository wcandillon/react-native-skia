#pragma once

#include <jsi/jsi.h>

#include <memory>
#include <mutex>
#include <optional>
#include <unordered_map>

namespace RNJsi {

namespace jsi = facebook::jsi;

/**
 * Per-runtime store for JSI values that native code wants to keep across
 * calls (currently: the prototype object of every NativeObject class).
 *
 * Ownership model (borrowed from react-native-nitro-modules' JSICache):
 *
 * - One JSICache exists per jsi::Runtime. It is attached as the NativeState
 *   of a hidden object stored on that runtime's `global`, so the RUNTIME owns
 *   the cache. When the runtime is destroyed the engine finalizes the object,
 *   ~JSICache runs while the runtime is still alive, and every cached
 *   jsi::Object is released correctly. Nothing outlives its runtime and
 *   nothing has to be leaked.
 *
 * - Native code reaches the cache through JSICache::get(runtime). A static
 *   map of std::weak_ptr, keyed by jsi::Runtime*, makes the lookup cheap; the
 *   pointer is only a map key, never proof that a runtime is alive. If the
 *   weak_ptr is expired (the runtime that owned it is gone) the entry is
 *   recreated on the runtime asking for it. This is what makes an in-process
 *   runtime recreate (expo-updates OTA apply, DevSettings.reload) safe even
 *   when the new runtime is allocated at the address of the freed one: the
 *   old cache was destroyed with the old runtime, so the reused address can
 *   only ever resolve to a fresh cache.
 *
 * - The cache itself is not locked: a jsi::Runtime is single-threaded, and
 *   the cache is only ever touched from its runtime's thread. Only the static
 *   runtime -> cache map is guarded.
 *
 * The same mechanism works for worklet runtimes (Reanimated UI runtime,
 * createWorkletRuntime, ...); each gets its own JSICache.
 */
class JSICache final : public jsi::NativeState {
public:
  /**
   * Key identifying one cached prototype. NativeObject<Derived> passes the
   * address of a per-class static, which is unique per Derived.
   */
  using PrototypeKey = const void *;

  /**
   * Returns the cache owned by `runtime`, creating it on first use. Must be
   * called on the runtime's thread.
   */
  static JSICache &get(jsi::Runtime &runtime);

  /**
   * Returns the cached prototype for `key` or nullptr if none was stored.
   */
  jsi::Object *getPrototype(PrototypeKey key);

  /**
   * Stores (or replaces) the prototype for `key` and returns it.
   */
  jsi::Object &setPrototype(PrototypeKey key, jsi::Object prototype);

  JSICache() = default;
  ~JSICache() override = default;
  JSICache(const JSICache &) = delete;
  JSICache &operator=(const JSICache &) = delete;

private:
  static std::shared_ptr<JSICache> getOrCreateOnGlobal(jsi::Runtime &runtime);

  std::unordered_map<PrototypeKey, jsi::Object> _prototypes;

  // Runtime -> cache. Weak on purpose: the runtime's global owns the cache.
  static std::mutex _registryMutex;
  static std::unordered_map<jsi::Runtime *, std::weak_ptr<JSICache>> _registry;
};

} // namespace RNJsi
