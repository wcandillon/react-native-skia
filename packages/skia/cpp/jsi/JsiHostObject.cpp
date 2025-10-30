#include "JsiHostObject.h"
#include <functional>
#include <mutex>
#include <unordered_map>
#include <vector>

namespace RNJsi {

struct HostFunctionCacheStore {
  std::mutex mutex;
  std::unordered_map<const JsiHostObject *, std::map<std::string, jsi::Function>>
      caches;
};

namespace {
const jsi::UUID kHostFunctionCacheStoreKey = jsi::UUID();

std::shared_ptr<HostFunctionCacheStore>
acquireHostFunctionCacheStore(jsi::Runtime &runtime) {
  auto existing = runtime.getRuntimeData(kHostFunctionCacheStoreKey);
  if (existing) {
    return std::static_pointer_cast<HostFunctionCacheStore>(existing);
  }
  auto store = std::make_shared<HostFunctionCacheStore>();
  runtime.setRuntimeData(kHostFunctionCacheStoreKey, store);
  return store;
}
} // namespace

JsiHostObject::~JsiHostObject() { releaseHostFunctionCaches(); }

void JsiHostObject::set(jsi::Runtime &rt, const jsi::PropNameID &name,
                        const jsi::Value &value) {

  auto nameStr = name.utf8(rt);

  /** Check the static setters map */
  const JsiPropertySettersMap &setters = getExportedPropertySettersMap();
  auto setter = setters.find(nameStr);
  if (setter != setters.end()) {
    auto dispatcher = std::bind(setter->second, this, std::placeholders::_1,
                                std::placeholders::_2);
    return dispatcher(rt, value);
  }

  if (_propMap.count(nameStr) > 0) {
    auto prop = _propMap.at(nameStr);
    (prop.set)(rt, value);
  }
}

jsi::Value eval(jsi::Runtime &runtime, const std::string &js) {
  return runtime.global()
      .getPropertyAsFunction(runtime, "eval")
      .call(runtime, js);
}

jsi::Value JsiHostObject::get(jsi::Runtime &runtime,
                              const jsi::PropNameID &name) {
  auto nameStr = name.utf8(runtime);

  // Happy path - cached host functions are cheapest to look up
  const JsiFunctionMap &funcs = getExportedFunctionMap();
  auto func = funcs.find(nameStr);

  // Check function cache
  if (func != funcs.end()) {
    std::map<std::string, jsi::Function> &runtimeCache =
        getHostFunctionCache(runtime);
    auto cachedFunc = runtimeCache.find(nameStr);
    if (cachedFunc != runtimeCache.end()) {
      return cachedFunc->second.asFunction(runtime);
    }
  }

  // Check the static getters map
  const JsiPropertyGettersMap &getters = getExportedPropertyGettersMap();
  auto getter = getters.find(nameStr);
  if (getter != getters.end()) {
    auto dispatcher = std::bind(getter->second, this, std::placeholders::_1);
    return dispatcher(runtime);
  }

  // Check the static function map
  if (func != funcs.end()) {

    // Create dispatcher
    auto dispatcher =
        std::bind(func->second, reinterpret_cast<JsiHostObject *>(this),
                  std::placeholders::_1, std::placeholders::_2,
                  std::placeholders::_3, std::placeholders::_4);

    // Add to cache - it is important to cache the results from the
    // createFromHostFunction function which takes some time.
    return getHostFunctionCache(runtime)
        .emplace(nameStr, jsi::Function::createFromHostFunction(runtime, name,
                                                                0, dispatcher))
        .first->second.asFunction(runtime);
  }

  if (_funcMap.count(nameStr) > 0) {
    return jsi::Function::createFromHostFunction(runtime, name, 0,
                                                 _funcMap.at(nameStr));
  }

  if (_propMap.count(nameStr) > 0) {
    auto prop = _propMap.at(nameStr);
    return (prop.get)(runtime);
  }

  // Check for dispose symbol as last resort
  static const auto disposeSymbol = jsi::PropNameID::forSymbol(
      runtime,
      eval(runtime, "Symbol.for('Symbol.dispose');").getSymbol(runtime));
  if (jsi::PropNameID::compare(runtime, disposeSymbol, name)) {
    // Recursively call get with "dispose" string
    auto disposeName = jsi::PropNameID::forAscii(runtime, "dispose");
    return get(runtime, disposeName);
  }

  return jsi::Value::undefined();
}

std::vector<jsi::PropNameID>
JsiHostObject::getPropertyNames(jsi::Runtime &runtime) {
  // statically exported functions
  const auto &funcs = getExportedFunctionMap();

  // Statically exported property getters
  const auto &getters = getExportedPropertyGettersMap();

  // Statically exported property setters
  const auto &setters = getExportedPropertySettersMap();

  std::vector<jsi::PropNameID> propNames;
  propNames.reserve(funcs.size() + getters.size() + setters.size() +
                    _funcMap.size() + _propMap.size());

  for (auto it = funcs.cbegin(); it != funcs.cend(); ++it) {
    propNames.push_back(jsi::PropNameID::forAscii(runtime, it->first));
  }

  for (auto it = getters.cbegin(); it != getters.cend(); ++it) {
    propNames.push_back(jsi::PropNameID::forUtf8(runtime, it->first));
  }

  for (auto it = getters.cbegin(); it != getters.cend(); ++it) {
    if (getters.count(it->first) == 0) {
      propNames.push_back(jsi::PropNameID::forUtf8(runtime, it->first));
    }
  }

  // functions
  for (auto it = _funcMap.cbegin(); it != _funcMap.cend(); ++it) {
    propNames.push_back(jsi::PropNameID::forAscii(runtime, it->first));
  }
  // props
  for (auto it = _propMap.cbegin(); it != _propMap.cend(); ++it) {
    propNames.push_back(jsi::PropNameID::forAscii(runtime, it->first));
  }
  return propNames;
}

std::map<std::string, jsi::Function> &
JsiHostObject::getHostFunctionCache(jsi::Runtime &runtime) const {
  auto store = acquireHostFunctionCacheStore(runtime);
  std::map<std::string, jsi::Function> *cache = nullptr;
  {
    std::lock_guard<std::mutex> lock(store->mutex);
    auto it = store->caches.find(this);
    if (it == store->caches.end()) {
      auto result = store->caches.emplace(
          this, std::map<std::string, jsi::Function>{});
      cache = &result.first->second;
      if (result.second) {
        std::lock_guard<std::mutex> storesLock(
            _hostFunctionCacheStoresMutex);
        _hostFunctionCacheStores.emplace_back(store);
      }
    } else {
      cache = &it->second;
    }
  }
  return *cache;
}

void JsiHostObject::releaseHostFunctionCaches() const {
  std::vector<std::weak_ptr<HostFunctionCacheStore>> stores;
  {
    std::lock_guard<std::mutex> storesLock(_hostFunctionCacheStoresMutex);
    stores.swap(_hostFunctionCacheStores);
  }

  for (auto &weakStore : stores) {
    if (auto store = weakStore.lock()) {
      std::lock_guard<std::mutex> lock(store->mutex);
      store->caches.erase(this);
    }
  }
}

} // namespace RNJsi
