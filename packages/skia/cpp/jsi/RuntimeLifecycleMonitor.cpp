#include "RuntimeLifecycleMonitor.h"

#include <mutex>
#include <unordered_map>
#include <unordered_set>
#include <utility>

namespace RNJsi {

static std::unordered_map<jsi::Runtime *,
                          std::unordered_set<RuntimeLifecycleListener *>>
    listeners;
static std::mutex listenersMutex;

struct RuntimeLifecycleMonitorObject : public jsi::HostObject {
  jsi::Runtime *_rt;
  explicit RuntimeLifecycleMonitorObject(jsi::Runtime *rt) : _rt(rt) {}
  ~RuntimeLifecycleMonitorObject() {
    std::unordered_set<RuntimeLifecycleListener *> listenersCopy;
    {
      std::lock_guard<std::mutex> lock(listenersMutex);
      auto listenersSet = listeners.find(_rt);
      if (listenersSet != listeners.end()) {
        listenersCopy = listenersSet->second;
        listeners.erase(listenersSet);
      }
    }
    for (auto listener : listenersCopy) {
      listener->onRuntimeDestroyed(_rt);
    }
  }
};

void RuntimeLifecycleMonitor::addListener(jsi::Runtime &rt,
                                          RuntimeLifecycleListener *listener) {
  bool shouldInstallMonitor = false;
  {
    std::lock_guard<std::mutex> lock(listenersMutex);
    auto listenersSet = listeners.find(&rt);
    if (listenersSet == listeners.end()) {
      std::unordered_set<RuntimeLifecycleListener *> newSet;
      newSet.insert(listener);
      listeners.emplace(&rt, std::move(newSet));
      shouldInstallMonitor = true;
    } else {
      listenersSet->second.insert(listener);
    }
  }
  if (shouldInstallMonitor) {
    // We install a global host object in the provided runtime, this way we can
    // use that host object destructor to get notified when the runtime is being
    // terminated. We use a unique name for the object as it gets saved with the
    // runtime's global object.
    rt.global().setProperty(
        rt, "__rnskia_rt_lifecycle_monitor",
        jsi::Object::createFromHostObject(
            rt, std::make_shared<RuntimeLifecycleMonitorObject>(&rt)));
  }
}

void RuntimeLifecycleMonitor::removeListener(
    jsi::Runtime &rt, RuntimeLifecycleListener *listener) {
  std::lock_guard<std::mutex> lock(listenersMutex);
  auto listenersSet = listeners.find(&rt);
  if (listenersSet == listeners.end()) {
    // nothing to do here
  } else {
    listenersSet->second.erase(listener);
  }
}

} // namespace RNJsi
