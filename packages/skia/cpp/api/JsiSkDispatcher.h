#pragma once

#include <algorithm>
#include <functional>
#include <memory>
#include <mutex>
#include <queue>
#include <thread>
#include <unordered_map>
#include <utility>
#include <vector>

#include "include/core/SkRefCnt.h"

namespace RNSkia {

/**
 * Thread-local dispatcher for managing deferred operations.
 * Each thread gets its own dispatcher instance for queueing operations
 * to be executed on that specific thread.
 */
class Dispatcher {
private:
  using Operation = std::function<void()>;

  struct DispatcherData {
    std::queue<Operation> operationQueue;
    std::mutex queueMutex;
    // Objects whose last reference must be dropped on this thread, kept
    // until nothing else holds them (see releaseWhenUnreferenced). Only
    // touched on this thread.
    std::vector<sk_sp<SkRefCnt>> heldUntilUnreferenced;
  };

  // Thread-local storage for dispatcher data
  static thread_local std::shared_ptr<DispatcherData> _threadDispatcher;

  // Global registry of all dispatchers by thread ID
  static inline std::mutex _registryMutex;
  static inline std::unordered_map<std::thread::id,
                                   std::weak_ptr<DispatcherData>>
      _dispatcherRegistry;

  std::shared_ptr<DispatcherData> _data;
  std::thread::id _threadId;

public:
  Dispatcher() : _threadId(std::this_thread::get_id()) {
    // Get or create dispatcher data for current thread
    if (!_threadDispatcher) {
      _threadDispatcher = std::make_shared<DispatcherData>();

      // Register in global registry
      std::lock_guard<std::mutex> lock(_registryMutex);
      _dispatcherRegistry[_threadId] = _threadDispatcher;
    }
    _data = _threadDispatcher;
  }

  /**
   * Get the dispatcher for the current thread.
   * Creates one if it doesn't exist.
   */
  static std::shared_ptr<Dispatcher> getDispatcher() {
    return std::make_shared<Dispatcher>();
  }

  /**
   * Get the dispatcher for a specific thread.
   * Returns nullptr if that thread doesn't have a dispatcher.
   */
  static std::shared_ptr<Dispatcher> getDispatcher(std::thread::id threadId) {
    std::lock_guard<std::mutex> lock(_registryMutex);
    auto it = _dispatcherRegistry.find(threadId);
    if (it != _dispatcherRegistry.end()) {
      if (auto data = it->second.lock()) {
        auto dispatcher = std::make_shared<Dispatcher>();
        dispatcher->_data = data;
        dispatcher->_threadId = threadId;
        return dispatcher;
      }
    }
    return nullptr;
  }

  /**
   * Queue an operation to be executed on the dispatcher's thread.
   * The operation will be executed when processQueue() is called on that
   * thread.
   */
  void run(Operation op) {
    if (!_data)
      return;

    std::lock_guard<std::mutex> lock(_data->queueMutex);
    _data->operationQueue.push(std::move(op));
  }

  /**
   * Hand `object` to the dispatcher's thread and keep it there until no one
   * else references it, then drop it on that thread (in processQueue()).
   *
   * For objects whose destruction must happen on this thread while other
   * threads may still hold references to them. A texture-backed SkImage made
   * with a Ganesh context is one: an SkPicture recorded on another thread,
   * a shader or a paint can keep the image alive after its wrapper is gone,
   * and whichever of them lets go last would otherwise return the texture to
   * this thread's GrResourceCache from its own thread.
   *
   * May be called from any thread.
   */
  void releaseWhenUnreferenced(sk_sp<SkRefCnt> object) {
    if (!object) {
      return;
    }
    // A raw pointer: the operation only runs in processQueue() on this
    // data, so it cannot outlive it, and a shared_ptr stored in the data's
    // own queue would keep the data alive.
    auto *data = _data.get();
    run([data, object = std::move(object)]() mutable {
      data->heldUntilUnreferenced.push_back(std::move(object));
    });
  }

  /**
   * Process all pending operations for the current thread.
   * Must be called from the thread that owns this dispatcher.
   * Returns the number of operations processed.
   */
  size_t processQueue() {
    if (!_data)
      return 0;

    // Only process if we're on the correct thread
    if (std::this_thread::get_id() != _threadId) {
      return 0;
    }

    std::queue<Operation> operations;
    {
      std::lock_guard<std::mutex> lock(_data->queueMutex);
      operations.swap(_data->operationQueue);
    }

    size_t count = operations.size();
    while (!operations.empty()) {
      auto &op = operations.front();
      op();
      operations.pop();
    }

    // Drop the held objects that nothing else references any more. unique()
    // is only true once every other holder has let go, and no other thread
    // can take a new reference from this list, so the last reference goes
    // here, on this thread.
    auto &held = _data->heldUntilUnreferenced;
    held.erase(std::remove_if(held.begin(), held.end(),
                              [](const sk_sp<SkRefCnt> &object) {
                                return object->unique();
                              }),
               held.end());

    return count;
  }

  /**
   * Get the number of pending operations.
   */
  size_t getPendingCount() const {
    if (!_data)
      return 0;

    std::lock_guard<std::mutex> lock(_data->queueMutex);
    return _data->operationQueue.size();
  }

  /**
   * Clean up dispatcher for a thread that's shutting down.
   */
  static void cleanup() {
    if (_threadDispatcher) {
      // Process any remaining operations
      auto dispatcher = getDispatcher();
      dispatcher->processQueue();

      // Remove from registry
      std::lock_guard<std::mutex> lock(_registryMutex);
      _dispatcherRegistry.erase(std::this_thread::get_id());

      _threadDispatcher.reset();
    }
  }
};

} // namespace RNSkia