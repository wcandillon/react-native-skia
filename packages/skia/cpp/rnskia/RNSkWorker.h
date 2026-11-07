#pragma once

#include <deque>
#include <exception>
#include <functional>
#include <mutex>
#include <thread>
#include <type_traits>
#include <utility>

#include <condition_variable>

#if defined(__APPLE__)
#include <pthread.h>
#elif defined(__ANDROID__)
#include <pthread.h>
#endif

#include "utils/RNSkLog.h"

namespace RNSkia {

/**
 * One background thread for work that neither a frame nor JS should wait
 * for: decoding an image, for instance. Jobs run in submission order, one at
 * a time, so a burst of them never fans out into as many threads. A job that
 * throws is logged and the worker goes on: an exception leaving a detached
 * thread ends the process.
 */
class RNSkWorker {
public:
  static RNSkWorker &getInstance() {
    // Never destroyed: the thread is detached and the process takes it down,
    // which spares the static destructor from joining it at exit.
    static auto *instance = new RNSkWorker();
    return *instance;
  }

  RNSkWorker(const RNSkWorker &) = delete;
  RNSkWorker &operator=(const RNSkWorker &) = delete;

  void post(std::function<void()> job) {
    {
      std::lock_guard<std::mutex> lock(_mutex);
      _jobs.push_back(std::move(job));
    }
    _condition.notify_one();
  }

  /**
   * Runs `make` and hands what it returns to `deliver`, both on the worker:
   * null when `make` throws, which is logged, so `deliver` runs either way.
   */
  template <typename Make, typename Deliver>
  void post(Make make, Deliver deliver) {
    post([make = std::move(make), deliver = std::move(deliver)]() {
      std::invoke_result_t<const Make &> result = nullptr;
      runLoggingFailure([&result, &make]() { result = make(); });
      deliver(std::move(result));
    });
  }

private:
  RNSkWorker() {
    std::thread([this]() { run(); }).detach();
  }

  void run() {
#if defined(__APPLE__)
    pthread_setname_np("RNSkia Worker");
#elif defined(__ANDROID__)
    pthread_setname_np(pthread_self(), "RNSkia Worker");
#endif
    for (;;) {
      std::function<void()> job;
      {
        std::unique_lock<std::mutex> lock(_mutex);
        _condition.wait(lock, [this]() { return !_jobs.empty(); });
        job = std::move(_jobs.front());
        _jobs.pop_front();
      }
      runLoggingFailure(job);
    }
  }

  template <typename Work> static void runLoggingFailure(const Work &work) {
    try {
      work();
    } catch (const std::exception &error) {
      RNSkLogger::logToConsole("RNSkia Worker: a job failed: %s", error.what());
    } catch (...) {
      RNSkLogger::logToConsole("RNSkia Worker: a job failed");
    }
  }

  std::mutex _mutex;
  std::condition_variable _condition;
  std::deque<std::function<void()>> _jobs;
};

} // namespace RNSkia
