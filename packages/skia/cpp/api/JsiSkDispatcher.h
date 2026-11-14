#pragma once

#include <functional>
#include <memory>
#include <mutex>
#include <queue>
#include <thread>
#include <utility>

namespace RNSkia {

/**
 * A queue of operations bound to the thread that created it, run on that
 * thread.
 *
 * Destroying a Graphite surface flushes it into its recorder and deregisters
 * it from it, and a recorder is single-threaded: an SkSurface has to be
 * destroyed on the thread it was created on. The JS garbage collector may
 * finalize the object holding it on any thread, and dispose() may be called
 * from another runtime, so the surface is handed to the dispatcher of the
 * creating thread instead. A thread bound to its loop (see
 * bindCurrentThread) destroys it when that loop runs the queue (see run); any
 * other thread the next time it makes a surface or calls flush(), asImage()
 * or makeImageSnapshot() on one (see JsiSkSurface).
 *
 * Graphite images and pictures need none of this: a Graphite resource may be
 * released from any thread, it returns to its recorder's cache through a
 * thread-safe queue.
 */
class Dispatcher : public std::enable_shared_from_this<Dispatcher> {
public:
  using Operation = std::function<void()>;
  /**
   * Posts an operation to the loop of the dispatcher's thread. A loop whose
   * thread is ending may drop it, as React Native's JS thread does on a
   * reload: what is queued then goes with the dispatcher. Called from any
   * thread, the garbage collector's included, so it must not throw.
   */
  using Scheduler = std::function<void(Operation)>;

  /** The dispatcher of the current thread, created on first use. */
  static std::shared_ptr<Dispatcher> getDispatcher() {
    static thread_local auto dispatcher = std::make_shared<Dispatcher>();
    return dispatcher;
  }

  /**
   * Has the current thread run its queue through `scheduler` from now on.
   * What the queue already holds runs now.
   */
  static void bindCurrentThread(Scheduler scheduler) {
    auto dispatcher = getDispatcher();
    {
      std::lock_guard<std::mutex> lock(dispatcher->_mutex);
      dispatcher->_scheduler = std::move(scheduler);
    }
    dispatcher->processQueue();
  }

  Dispatcher() : _threadId(std::this_thread::get_id()) {}

  /** Whether the caller runs on the dispatcher's thread. */
  bool isCurrentThread() const {
    return std::this_thread::get_id() == _threadId;
  }

  /** Whether the thread runs its queue from its loop (see bindCurrentThread).
   */
  bool isBound() {
    std::lock_guard<std::mutex> lock(_mutex);
    return static_cast<bool>(_scheduler);
  }

  /**
   * Lets go of `object` on the dispatcher's thread: right away when called
   * from it, otherwise once that thread runs its queue (see run). Pass the
   * last reference for the object to be destroyed there.
   */
  template <typename T> void release(T object) {
    if (!object || isCurrentThread()) {
      return;
    }
    run([object = std::move(object)]() {});
  }

  /**
   * Queues an operation to run on the dispatcher's thread: the next time the
   * thread calls processQueue(), which a thread bound to a loop does from a
   * run of the queue posted there. A run is posted when the queue was empty:
   * the one posted before takes what is queued until it takes the queue.
   */
  void run(Operation operation) {
    Scheduler scheduler;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      if (_queue.empty()) {
        scheduler = _scheduler;
      }
      _queue.push(std::move(operation));
      // libc++ copies a small, nothrow-copyable std::function target on a
      // move and leaves the source holding it (__functional/function.h):
      // dropped here, the queue's copy is the last one.
      operation = nullptr;
    }
    if (!scheduler) {
      return;
    }
    std::weak_ptr<Dispatcher> weakThis = weak_from_this();
    scheduler([weakThis]() {
      if (auto self = weakThis.lock()) {
        self->processQueue();
      }
    });
  }

  /**
   * Runs the queued operations. A no-op on any thread but the dispatcher's.
   * Returns the number of operations run.
   */
  size_t processQueue() {
    if (!isCurrentThread()) {
      return 0;
    }
    std::queue<Operation> operations;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      operations.swap(_queue);
    }
    size_t count = operations.size();
    while (!operations.empty()) {
      operations.front()();
      operations.pop();
    }
    return count;
  }

private:
  std::thread::id _threadId;
  std::mutex _mutex;
  std::queue<Operation> _queue;
  Scheduler _scheduler;
};

} // namespace RNSkia
