#pragma once

// For the host-side checks (see run.sh): a thread that runs what is posted to
// it, in order, as the JS thread and the main thread run their loops.

#include <condition_variable>
#include <functional>
#include <future>
#include <mutex>
#include <queue>
#include <thread>
#include <utility>

#include "api/JsiSkDispatcher.h"

class Loop {
public:
  Loop() : _thread([this]() { work(); }) {}

  ~Loop() {
    {
      std::lock_guard<std::mutex> lock(_mutex);
      _stopping = true;
    }
    _condition.notify_all();
    _thread.join();
  }

  void post(std::function<void()> operation) {
    {
      std::lock_guard<std::mutex> lock(_mutex);
      _operations.push(std::move(operation));
    }
    _condition.notify_all();
  }

  // Runs `operation` on the loop's thread and waits for it.
  void runAndWait(const std::function<void()> &operation) {
    std::promise<void> done;
    auto finished = done.get_future();
    post([&]() {
      operation();
      done.set_value();
    });
    finished.wait();
  }

  RNSkia::Dispatcher::Scheduler scheduler() {
    return [this](RNSkia::Dispatcher::Operation operation) {
      post(std::move(operation));
      return true;
    };
  }

  std::thread::id id() const { return _thread.get_id(); }

private:
  void work() {
    while (true) {
      std::function<void()> operation;
      {
        std::unique_lock<std::mutex> lock(_mutex);
        _condition.wait(lock,
                        [this]() { return _stopping || !_operations.empty(); });
        if (_operations.empty()) {
          return;
        }
        operation = std::move(_operations.front());
        _operations.pop();
      }
      operation();
    }
  }

  std::mutex _mutex;
  std::condition_variable _condition;
  std::queue<std::function<void()>> _operations;
  bool _stopping = false;
  std::thread _thread;
};
