#pragma once

#include <atomic>
#include <cstddef>
#include <memory>
#include <mutex>
#include <shared_mutex>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

namespace RNSkia {

/**
 * What the process knows about each native view id: the view registered for
 * it, if any, and the latest value of each property JS set for it.
 *
 * An entry has two possible owners, and lives for as long as it has one:
 * - the JS component of the id, from the first property it sets
 *   (setJsiProperty) until it unmounts (releaseView);
 * - the native view registered for the id, until it is torn down.
 *
 * Fabric tears native views down under a mounted component (display: none,
 * view recycling) and creates new ones for the same id, while JS only sends
 * a recording when the scene changes. So the properties stay in the entry
 * after they reach a view, and the next view for the id gets them too. The
 * other way around, a native view outlives its component (exit animations,
 * screen transitions): the entry then stays until that view is torn down.
 *
 * The registry is a template so that this bookkeeping can be tested on the
 * host, without a view or a JS runtime (see cpp-tests/ViewRegistryTest.cpp).
 */
template <typename View, typename Property> class RNSkViewRegistry {
public:
  struct Info {
    std::shared_ptr<View> view;
    // "recorder" and "picture" are the content of the view: setting one
    // replaces the other (see setProperty).
    std::unordered_map<std::string, Property> props;
    // Whether the JS component of the id is mounted.
    bool owned = false;
  };

  static RNSkViewRegistry &getInstance() {
    static RNSkViewRegistry instance;
    return instance;
  }

  RNSkViewRegistry(const RNSkViewRegistry &) = delete;
  RNSkViewRegistry &operator=(const RNSkViewRegistry &) = delete;

  // The id of a view about to mount. Ids are handed out here, once for the
  // life of the process, rather than counted by each JS runtime from the
  // same start: this registry outlives a reload, and the views of the bundle
  // being replaced unregister while the new bundle is already mounting. A
  // view counted from the same start as its predecessor would share its
  // entry (#4312).
  size_t allocateId() { return _nextId.fetch_add(1); }

  // JS sets a property for the id, which its component owns from here on.
  // The view registered for the id, if any, gets the property through
  // `deliver(view, name, value)`, under the registry lock.
  template <typename F>
  void setProperty(size_t id, const std::string &name, Property value,
                   F &&deliver) {
    std::unique_lock<std::shared_mutex> lock(_mutex);
    auto &info = _registry[id];
    info.owned = true;
    if (name == "recorder") {
      info.props.erase("picture");
    } else if (name == "picture") {
      info.props.erase("recorder");
    }
    auto it = info.props.insert_or_assign(name, std::move(value)).first;
    if (info.view != nullptr) {
      deliver(info.view, name, it->second);
    }
  }

  // The JS component of the id has unmounted. A view still registered keeps
  // the entry until it is torn down.
  void release(size_t id) {
    std::unique_lock<std::shared_mutex> lock(_mutex);
    auto it = _registry.find(id);
    if (it == _registry.end()) {
      return;
    }
    it->second.owned = false;
    if (it->second.view == nullptr) {
      _registry.erase(it);
    }
  }

  // Registers `view` for the id. A new view for the id gets every property
  // through `deliver(view, props)`, under the registry lock; a view that
  // registers again (it does on every props update) already has them.
  template <typename F>
  void registerView(size_t id, std::shared_ptr<View> view, F &&deliver) {
    std::unique_lock<std::shared_mutex> lock(_mutex);
    auto &info = _registry[id];
    if (info.view == view) {
      return;
    }
    info.view = std::move(view);
    deliver(info.view, info.props);
  }

  // Unregisters `view` (the caller's own view, or nullptr when it has none
  // any more) from the id. Returns false when another view has taken the id
  // over: a view torn down late must not detach it.
  bool unregisterView(size_t id, const View *view) {
    std::unique_lock<std::shared_mutex> lock(_mutex);
    auto it = _registry.find(id);
    if (it == _registry.end()) {
      return true;
    }
    auto &info = it->second;
    if (info.view != nullptr && info.view.get() != view) {
      return false;
    }
    if (info.owned) {
      // The component is still mounted: the entry waits for the view Fabric
      // creates for it next.
      info.view = nullptr;
    } else {
      _registry.erase(it);
    }
    return true;
  }

  // Runs func on an existing entry under the registry's shared lock: func is
  // not called for an unknown id. Other readers may hold the entry at the
  // same time, so func must not modify it; the objects its props reference
  // may be modified under their own lock.
  template <typename F> void withExistingInfo(size_t id, F &&func) {
    std::shared_lock<std::shared_mutex> lock(_mutex);
    auto it = _registry.find(id);
    if (it != _registry.end()) {
      func(it->second);
    }
  }

  // Read-only lookup: never creates a registry entry.
  std::shared_ptr<View> getView(size_t id) {
    std::shared_lock<std::shared_mutex> lock(_mutex);
    auto it = _registry.find(id);
    return it != _registry.end() ? it->second.view : nullptr;
  }

  // The views registered right now, for a call on each of them outside of
  // the registry lock. Any thread.
  std::vector<std::shared_ptr<View>> getViews() {
    std::vector<std::shared_ptr<View>> views;
    std::shared_lock<std::shared_mutex> lock(_mutex);
    views.reserve(_registry.size());
    for (const auto &entry : _registry) {
      if (entry.second.view != nullptr) {
        views.push_back(entry.second.view);
      }
    }
    return views;
  }

  // The number of entries, for tests.
  size_t size() {
    std::shared_lock<std::shared_mutex> lock(_mutex);
    return _registry.size();
  }

  void clear() {
    std::unique_lock<std::shared_mutex> lock(_mutex);
    _registry.clear();
  }

private:
  RNSkViewRegistry() = default;
  mutable std::shared_mutex _mutex;
  std::unordered_map<size_t, Info> _registry;
  std::atomic<size_t> _nextId{1000};
};

} // namespace RNSkia
