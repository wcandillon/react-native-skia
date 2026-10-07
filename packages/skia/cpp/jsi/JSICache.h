#pragma once

#include <jsi/jsi.h>

#include <memory>
#include <mutex>
#include <typeindex>
#include <unordered_map>

namespace RNJsi {

namespace jsi = facebook::jsi;

/**
 * Per-runtime store for JSI values that native code wants to keep across
 * calls: the prototype object of every NativeObject class, and the JS
 * wrapper of every native object that has one on the runtime.
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
   * Key identifying one cached prototype: the C++ type of the NativeObject
   * subclass (std::type_index(typeid(Derived))), as in Nitro. It prints as
   * the class name in a debugger.
   */
  using PrototypeKey = std::type_index;

  /**
   * Returns the cache owned by `runtime`, creating it on first use. Must be
   * called on the runtime's thread.
   */
  static JSICache &get(jsi::Runtime &runtime);

  /**
   * Returns the cached prototype for `key` or nullptr if none was stored.
   *
   * The pointer points into `_prototypes`. std::unordered_map never
   * invalidates pointers/references to elements on insert or rehash (only on
   * erase of that element, which we never do), so it stays valid for as long
   * as the runtime does. Do not swap the container for one without that
   * guarantee (std::vector, absl::flat_hash_map, ...).
   */
  jsi::Object *getPrototype(PrototypeKey key);

  /**
   * Stores (or replaces) the prototype for `key` and returns it.
   */
  jsi::Object &setPrototype(PrototypeKey key, jsi::Object prototype);

  /**
   * Returns the JS wrapper stored for `nativeObject` on this runtime, or
   * undefined if none was stored or the wrapper has been collected.
   *
   * The key is the native object's address. A live wrapper keeps its native
   * object alive (the object is the wrapper's NativeState), so as long as
   * the entry locks it still belongs to that object. Once the wrapper has
   * been collected the entry is stale and is skipped or replaced, so an
   * address reused by a new object can never resolve to the old wrapper.
   */
  jsi::Value lockWrapper(jsi::Runtime &runtime, const void *nativeObject);

  /**
   * Stores `wrapper` as the JS wrapper of `nativeObject` on this runtime.
   * Only a weak reference is kept: the wrapper stays collectable, and the
   * native object is released when it goes away.
   */
  void setWrapper(jsi::Runtime &runtime, const void *nativeObject,
                  const jsi::Object &wrapper);

  JSICache() = default;
  ~JSICache() override = default;
  JSICache(const JSICache &) = delete;
  JSICache &operator=(const JSICache &) = delete;

private:
  static std::shared_ptr<JSICache> getOrCreateOnGlobal(jsi::Runtime &runtime);

  std::unordered_map<PrototypeKey, jsi::Object> _prototypes;
  // Native object -> its wrapper on this runtime. Entries of collected
  // wrappers are pruned in setWrapper once the map has doubled since the
  // last pruning, so it stays proportional to the number of live wrappers.
  std::unordered_map<const void *, jsi::WeakObject> _wrappers;
  size_t _pruneWrappersAt = kMinPruneWrappersAt;
  static constexpr size_t kMinPruneWrappersAt = 64;

  // Runtime -> cache. Weak on purpose: the runtime's global owns the cache.
  static std::mutex _registryMutex;
  static std::unordered_map<jsi::Runtime *, std::weak_ptr<JSICache>> _registry;
};

} // namespace RNJsi
