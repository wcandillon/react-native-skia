#pragma once

#include <sys/eventfd.h>
#include <unistd.h>

#include <cerrno>
#include <functional>
#include <memory>
#include <mutex>
#include <queue>
#include <system_error>
#include <utility>

#if defined(__ANDROID__)
#include <android/looper.h>
#endif

namespace RNSkia {

class MainThreadTasks;

// The tasks of a looper's thread. A task queued into an empty queue wakes the
// looper with a write to an eventfd it watches, which calls no Java: posting
// can fail only in the queue's own allocation.
class LooperTasks {
public:
#if defined(__ANDROID__)
  // The tasks of the current thread's looper, made on the first call and
  // watched through the NDK's looper, or none on a thread without a looper or
  // in a process that can open no eventfd. The thread holds them while it
  // lives, as a looper may still run a callback another thread removed
  // (ALooper_removeFd); whichever thread lets go of them last after that
  // removes their eventfd without Java.
  static std::shared_ptr<LooperTasks> forCurrentThread() {
    static thread_local std::shared_ptr<LooperTasks> tasks =
        listenOnCurrentThread();
    return tasks;
  }
#endif

  ~LooperTasks() {
#if defined(__ANDROID__)
    if (_looper != nullptr) {
      ALooper_removeFd(_looper, _wakeup);
      ALooper_release(_looper);
    }
#endif
    close(_wakeup);
  }

  LooperTasks(const LooperTasks &) = delete;
  LooperTasks &operator=(const LooperTasks &) = delete;

  void post(std::function<void()> task) {
    // A queue that held tasks already has a write made or coming for them.
    if (queue(std::move(task))) {
      eventfd_write(_wakeup, 1);
    }
  }

private:
  friend class MainThreadTasks;

  LooperTasks() : _wakeup(eventfd(0, EFD_CLOEXEC | EFD_NONBLOCK)) {
    if (_wakeup == -1) {
      throw std::system_error(errno, std::generic_category(), "eventfd");
    }
  }

  int wakeup() const { return _wakeup; }

  // Whether the queue was empty.
  bool queue(std::function<void()> task) {
    std::lock_guard<std::mutex> lock(_mutex);
    const bool wasEmpty = _tasks.empty();
    _tasks.push(std::move(task));
    return wasEmpty;
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

    // Outside the lock: a poster may hold a lock that a task waits for
    // (#3513).
    while (!tasks.empty()) {
      auto handler = std::move(tasks.front());
      tasks.pop();
      if (handler) {
        handler();
      }
    }
  }

#if defined(__ANDROID__)
  static std::shared_ptr<LooperTasks> listenOnCurrentThread() {
    ALooper *looper = ALooper_forThread();
    if (looper == nullptr) {
      return nullptr;
    }
    std::shared_ptr<LooperTasks> tasks;
    try {
      tasks.reset(new LooperTasks());
    } catch (const std::system_error &) {
      return nullptr;
    }
    if (ALooper_addFd(looper, tasks->_wakeup, ALOOPER_POLL_CALLBACK,
                      ALOOPER_EVENT_INPUT, runFromLooper, tasks.get()) != 1) {
      return nullptr;
    }
    ALooper_acquire(looper);
    tasks->_looper = looper;
    return tasks;
  }

  static int runFromLooper(int, int, void *tasks) {
    static_cast<LooperTasks *>(tasks)->run();
    // The callback stays registered (ALooper_callbackFunc).
    return 1;
  }

  ALooper *_looper = nullptr;
#endif
  std::mutex _mutex;
  std::queue<std::function<void()>> _tasks;
  int _wakeup;
};

} // namespace RNSkia
