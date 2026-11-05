#pragma once

#include <unistd.h>

#include <functional>
#include <utility>

#include "RNSkLooperTasks.h"

namespace RNSkia {

// The main thread's tasks, one queue for the process as the main looper is
// one. PlatformContext registers their eventfd with the main looper once.
class MainThreadTasks {
public:
  static MainThreadTasks &getInstance() {
    // Never destroyed: other threads may still post while the process exits.
    static auto *instance = new MainThreadTasks();
    return *instance;
  }

  int wakeup() const { return _tasks.wakeup(); }

  void post(std::function<void()> task) {
    // An app's main thread is its process's first thread, and a task handed
    // over there runs on the spot with what is queued (see
    // RNSkView::setPresentThread).
    if (gettid() == getpid()) {
      _tasks.queue(std::move(task));
      _tasks.run();
    } else {
      _tasks.post(std::move(task));
    }
  }

  void run() { _tasks.run(); }

private:
  MainThreadTasks() = default;

  LooperTasks _tasks;
};

} // namespace RNSkia
