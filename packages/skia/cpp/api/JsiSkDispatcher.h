#pragma once

#include <functional>
#include <memory>
#include <mutex>
#include <queue>
#include <thread>
#include <utility>

namespace RNSkia {

/**
 * A queue of operations bound to the thread that created it.
 *
 * Destroying a Graphite surface flushes it into its recorder and deregisters
 * it from it, and a recorder is single-threaded: an SkSurface has to be
 * destroyed on the thread it was created on. The JS garbage collector may
 * finalize the object holding it on any thread, so the finalizer hands the
 * surface to the dispatcher of the creating thread instead, and that thread
 * destroys it the next time it works with a surface (see JsiSkSurface).
 *
 * Graphite images and pictures need none of this: a Graphite resource may be
 * released from any thread, it returns to its recorder's cache through a
 * thread-safe queue.
 */
class Dispatcher {
public:
  using Operation = std::function<void()>;

  /** The dispatcher of the current thread, created on first use. */
  static std::shared_ptr<Dispatcher> getDispatcher() {
    static thread_local auto dispatcher = std::make_shared<Dispatcher>();
    return dispatcher;
  }

  Dispatcher() : _threadId(std::this_thread::get_id()) {}

  /** Whether the caller runs on the dispatcher's thread. */
  bool isCurrentThread() const {
    return std::this_thread::get_id() == _threadId;
  }

  /**
   * Lets go of `object` on the dispatcher's thread: right away when called
   * from it, otherwise when that thread next calls processQueue(). Pass the
   * last reference for the object to be destroyed there.
   */
  template <typename T> void release(T object) {
    if (!object || isCurrentThread()) {
      return;
    }
    run([object = std::move(object)]() {});
  }

  /** Queues an operation to run on the dispatcher's thread. */
  void run(Operation op) {
    std::lock_guard<std::mutex> lock(_mutex);
    _queue.push(std::move(op));
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
};

} // namespace RNSkia
