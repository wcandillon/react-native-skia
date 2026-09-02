#include "JSICache.h"

#include <iterator>
#include <memory>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <utility>

namespace RNJsi {

namespace {
// Hidden global holding the per-runtime cache object. Named so it is
// obviously ours if it ever shows up in a debugger or heap snapshot.
constexpr const char *kGlobalName = "__rnskiaJsiCache";
} // namespace

std::mutex JSICache::_registryMutex;
std::unordered_map<jsi::Runtime *, std::weak_ptr<JSICache>> JSICache::_registry;

JSICache &JSICache::get(jsi::Runtime &runtime) {
  {
    std::lock_guard<std::mutex> lock(_registryMutex);
    auto it = _registry.find(&runtime);
    if (it != _registry.end()) {
      if (auto cache = it->second.lock()) {
        // The cache is kept alive by `runtime`'s global, so the raw
        // reference stays valid for as long as the caller may legally use
        // `runtime` on this thread.
        return *cache;
      }
      // Expired: the runtime that owned this entry is gone and `&runtime` is
      // a new runtime reusing the address. Fall through and recreate.
    }
  }
  auto cache = getOrCreateOnGlobal(runtime);
  {
    std::lock_guard<std::mutex> lock(_registryMutex);
    // Drop entries of runtimes that are gone so the map does not grow by one
    // stale pointer per reload / worklet runtime.
    for (auto it = _registry.begin(); it != _registry.end();) {
      it = it->second.expired() ? _registry.erase(it) : std::next(it);
    }
    _registry[&runtime] = cache;
  }
  return *cache;
}

std::shared_ptr<JSICache> JSICache::getOrCreateOnGlobal(jsi::Runtime &runtime) {
  auto global = runtime.global();
  auto existing = global.getProperty(runtime, kGlobalName);
  if (existing.isObject()) {
    auto obj = existing.getObject(runtime);
    if (obj.hasNativeState<JSICache>(runtime)) {
      return obj.getNativeState<JSICache>(runtime);
    }
  }
  if (!existing.isUndefined()) {
    // Something else already claimed our global. The most likely cause is two
    // copies of react-native-skia loaded in one process (each has its own
    // JSICache type, so the NativeState check above fails). Say so instead of
    // letting Object.defineProperty throw a bare TypeError on the
    // non-configurable property.
    throw std::runtime_error(
        std::string("react-native-skia: global.") + kGlobalName +
        " already exists but is not our JSICache. Is react-native-skia "
        "linked twice, or is another module using this global?");
  }
  auto cache = std::make_shared<JSICache>();
  jsi::Object holder(runtime);
  holder.setNativeState(runtime, cache);
  // Non-enumerable, non-writable, non-configurable: JS code must not be able
  // to drop the holder (which would finalize the cache under our feet).
  auto objectCtor = global.getPropertyAsObject(runtime, "Object");
  auto defineProperty =
      objectCtor.getPropertyAsFunction(runtime, "defineProperty");
  jsi::Object descriptor(runtime);
  descriptor.setProperty(runtime, "value", std::move(holder));
  descriptor.setProperty(runtime, "writable", false);
  descriptor.setProperty(runtime, "enumerable", false);
  descriptor.setProperty(runtime, "configurable", false);
  defineProperty.call(runtime, global,
                      jsi::String::createFromAscii(runtime, kGlobalName),
                      descriptor);
  return cache;
}

jsi::Object *JSICache::getPrototype(PrototypeKey key) {
  auto it = _prototypes.find(key);
  return it == _prototypes.end() ? nullptr : &it->second;
}

jsi::Object &JSICache::setPrototype(PrototypeKey key, jsi::Object prototype) {
  auto [it, inserted] = _prototypes.insert_or_assign(key, std::move(prototype));
  (void)inserted;
  return it->second;
}

} // namespace RNJsi
