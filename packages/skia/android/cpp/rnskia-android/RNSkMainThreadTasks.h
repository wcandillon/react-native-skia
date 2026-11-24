#pragma once

#include <sys/eventfd.h>
#include <unistd.h>

#include <cerrno>
#include <functional>
#include <mutex>
#include <queue>
#include <system_error>
#include <utility>

namespace RNSkia {

// The main thread's tasks, one queue for the process as the main looper is
// one. A task queued off the main thread wakes the looper with a write to an
// eventfd it watches (PlatformContext registers it once), which calls no Java:
// posting can fail only in the queue's own allocation.
class MainThreadTasks {
public:
  static MainThreadTasks &getInstance() {
    // Never destroyed: other threads may still post while the process exits.
    static auto *instance = new MainThreadTasks();
    return *instance;
  }

  int wakeup() const { return _wakeup; }

  void post(std::function<void()> task) {
    bool wasEmpty = false;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      wasEmpty = _tasks.empty();
      _tasks.push(std::move(task));
    }
    // An app's main thread is its process's first thread, and a task handed
    // over there runs on the spot with what is queued (see
    // RNSkView::setPresentThread).
    if (gettid() == getpid()) {
      run();
    } else if (wasEmpty) {
      // A queue that held tasks already has a write made or coming for them.
      eventfd_write(_wakeup, 1);
    }
  }

  void run() {
    // Read before the queue is taken: a task queued after the read is taken
    // with it, or finds the queue empty and writes again.
    eventfd_t wakeups;
    eventfd_read(_wakeup, &wakeups);
    std::queue<std::function<void()>> tasks;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      std::swap(tasks, _tasks);
    }

    while (!tasks.empty()) {
      auto handler = std::move(tasks.front());
      tasks.pop();
      if (handler) {
        handler();
      }
    }
  }

private:
  MainThreadTasks() : _wakeup(eventfd(0, EFD_CLOEXEC | EFD_NONBLOCK)) {
    if (_wakeup == -1) {
      throw std::system_error(errno, std::generic_category(), "eventfd");
    }
  }

  std::mutex _mutex;
  std::queue<std::function<void()>> _tasks;
  int _wakeup;
};

} // namespace RNSkia
