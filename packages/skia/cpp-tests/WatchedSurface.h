#pragma once

// For the host-side checks (see run.sh): a stand-in for a surface that tells
// which thread destroyed it.

#include <functional>
#include <future>
#include <memory>
#include <thread>
#include <utility>

// Stands in for a Graphite surface: runs `onDestroy` on the thread that
// destroys it.
class Surface {
public:
  explicit Surface(std::function<void()> onDestroy)
      : _onDestroy(std::move(onDestroy)) {}
  ~Surface() { _onDestroy(); }

private:
  std::function<void()> _onDestroy;
};

// A surface that tells which thread destroyed it.
struct WatchedSurface {
  std::shared_ptr<Surface> surface;
  std::shared_future<std::thread::id> destroyedOn;
};

inline WatchedSurface makeWatchedSurface() {
  auto promise = std::make_shared<std::promise<std::thread::id>>();
  auto destroyedOn = promise->get_future().share();
  auto surface = std::make_shared<Surface>(
      [promise]() { promise->set_value(std::this_thread::get_id()); });
  return {std::move(surface), std::move(destroyedOn)};
}
