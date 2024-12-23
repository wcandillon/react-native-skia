#pragma once

#include <memory>
#include <shared_mutex>
#include <unordered_map>

#include "WindowContext.h"

#include "include/core/SkPicture.h"

namespace RNSkia {


class SurfaceInfo {
public:
  SurfaceInfo() = default;
  ~SurfaceInfo() = default;

  void setPicture(sk_sp<SkPicture> picture) {
    std::shared_lock<std::shared_mutex> lock(_mutex);
    _picture = picture;
  }

  void setContext(std::unique_ptr<WindowContext> context) {
    std::shared_lock<std::shared_mutex> lock(_mutex);
    _context = std::move(context);
  }

  void resize(int width, int height) {
    std::shared_lock<std::shared_mutex> lock(_mutex);
    if (_context != nullptr) {
      _context->resize(width, height);
    }
  }

private:
  sk_sp<SkPicture> _picture = nullptr;
  std::unique_ptr<WindowContext> _context = nullptr;
  mutable std::shared_mutex _mutex;
};

class SurfaceRegistry {
public:

  static SurfaceRegistry &getInstance() {
    static SurfaceRegistry instance;
    return instance;
  }

  SurfaceRegistry(const SurfaceRegistry &) = delete;
  SurfaceRegistry &operator=(const SurfaceRegistry &) = delete;

  std::shared_ptr<SurfaceInfo> getSurfaceInfo(int id) {
    std::shared_lock<std::shared_mutex> lock(_mutex);
    auto it = _registry.find(id);
    if (it != _registry.end()) {
      return it->second;
    }
    return nullptr;
  }

  std::shared_ptr<SurfaceInfo> addSurfaceInfo(int id) {
    std::unique_lock<std::shared_mutex> lock(_mutex);
    auto info = std::make_shared<SurfaceInfo>();
    _registry[id] = info;
    return info;
  }

  std::shared_ptr<SurfaceInfo>
  getSurfaceInfoOrCreate(int id) {
    std::unique_lock<std::shared_mutex> lock(_mutex);
    auto it = _registry.find(id);
    if (it != _registry.end()) {
      return it->second;
    }
    auto info = std::make_shared<SurfaceInfo>();
    _registry[id] = info;
    return info;
  }

  void removeSurfaceInfo(int id) {
    std::unique_lock<std::shared_mutex> lock(_mutex);
    _registry.erase(id);
  }

private:
  SurfaceRegistry() = default;
  mutable std::shared_mutex _mutex;
  std::unordered_map<int, std::shared_ptr<SurfaceInfo>> _registry;
};

} // namespace RNSkia