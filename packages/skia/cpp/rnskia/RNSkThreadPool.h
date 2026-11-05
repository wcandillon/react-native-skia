#pragma once

#include <algorithm>
#include <atomic>
#include <chrono>
#include <condition_variable>
#include <cstddef>
#include <cstdint>
#include <deque>
#include <functional>
#include <memory>
#include <mutex>
#include <string>
#include <thread>
#include <utility>
#include <vector>

#include "RNSkThreadPriority.h"

namespace RNSkia {

/**
 * The threads that replay recordings for SkiaGraphiteViews, so that neither
 * the JS thread nor the UI thread pays for a frame.
 *
 * Each thread owns a lane: a queue of its own, run in submission order. A
 * view takes a lane once (acquireLane, the least populated one at the time)
 * and posts every job of its life to it, so that all its frames are recorded
 * on the same thread. The threads cache GPU resources in Graphite recorders
 * of their own, which only their own thread may touch (glyph and path
 * atlases, scratch textures, uploaded images): a view that moved between
 * threads would warm up every recorder in turn and find each one cold
 * again. Views on different lanes are what run in parallel.
 *
 * Each thread also runs an idle task, on itself, when asked to (see
 * requestIdleTask).
 */
class RNSkThreadPool {
public:
  /** How long after requestIdleTask() the threads run the idle task. */
  static constexpr std::chrono::seconds kIdleDelay{2};

  /** A thread of the pool (see acquireLane). */
  using Lane = size_t;

  static RNSkThreadPool &getInstance() {
    // Never destroyed: the threads are detached and the process takes them
    // down, which spares the static destructor from joining them at exit.
    static auto *instance = new RNSkThreadPool();
    return *instance;
  }

  RNSkThreadPool(const RNSkThreadPool &) = delete;
  RNSkThreadPool &operator=(const RNSkThreadPool &) = delete;

  /** The number of threads, hence of lanes. */
  size_t size() const { return _workers.size(); }

  /**
   Takes the lane with the fewest views on it, for a view: every job of the
   view goes to it (post), until the view gives it back (releaseLane). Any
   thread.
   */
  Lane acquireLane() {
    std::lock_guard<std::mutex> lock(_lanesMutex);
    Lane lane = 0;
    for (Lane i = 1; i < _views.size(); i++) {
      if (_views[i] < _views[lane]) {
        lane = i;
      }
    }
    _views[lane]++;
    return lane;
  }

  /** Gives back a lane taken with acquireLane(). Any thread. */
  void releaseLane(Lane lane) {
    std::lock_guard<std::mutex> lock(_lanesMutex);
    if (lane < _views.size() && _views[lane] > 0) {
      _views[lane]--;
    }
  }

  /** Queues a job on a lane, behind those already waiting on it. */
  void post(Lane lane, std::function<void()> job) {
    auto &worker = *_workers[lane % _workers.size()];
    {
      std::lock_guard<std::mutex> lock(worker.mutex);
      worker.jobs.push_back(std::move(job));
    }
    worker.condition.notify_one();
  }

  /**
   The task every thread runs, on itself, after requestIdleTask(). `idle`
   says whether the thread ran no job for kIdleDelay: it records nothing for
   now, and whatever it caches can go.
   */
  void setIdleTask(std::function<void(bool idle)> task) {
    std::lock_guard<std::mutex> lock(_idleMutex);
    _idleTask = std::move(task);
  }

  /**
   Asks every thread to run the idle task kIdleDelay from now, as soon as no
   job is waiting on it: a thread busy with jobs runs it between two of
   them, once its queue is empty. Requests add up: a thread runs the task
   once for all those it has not served, kIdleDelay after the latest. Any
   thread.
   */
  void requestIdleTask() {
    {
      std::lock_guard<std::mutex> lock(_idleMutex);
      _idleRequest++;
      _idleRequestTime = Clock::now();
    }
    for (auto &worker : _workers) {
      // Under the worker's lock: a thread reads the request under it before
      // waiting (see run), so the request is either read or waited for.
      std::lock_guard<std::mutex> lock(worker->mutex);
      worker->condition.notify_all();
    }
  }

  /**
   requestIdleTask() once the pool runs, and nothing before: its threads
   cache nothing until then. Any thread.
   */
  static void requestIdleTaskIfStarted() {
    if (auto *pool = started().load(std::memory_order_acquire)) {
      pool->requestIdleTask();
    }
  }

  /** Whether the calling thread is one of the pool's. */
  static bool isPoolThread() { return poolThread(); }

private:
  static bool &poolThread() {
    static thread_local bool isPool = false;
    return isPool;
  }

  static std::atomic<RNSkThreadPool *> &started() {
    static std::atomic<RNSkThreadPool *> pool{nullptr};
    return pool;
  }

  using Clock = std::chrono::steady_clock;

  /** A thread and its lane. */
  struct Worker {
    std::mutex mutex;
    std::condition_variable condition;
    std::deque<std::function<void()>> jobs;
  };

  RNSkThreadPool() {
    auto cores = std::thread::hardware_concurrency();
    const unsigned size = cores == 0 ? 2u : std::clamp(cores / 2, 2u, 4u);
    _workers.reserve(size);
    for (unsigned i = 0; i < size; i++) {
      _workers.push_back(std::make_unique<Worker>());
    }
    _views.assign(size, 0);
    // Started once every worker exists: a thread reads _workers.
    for (unsigned i = 0; i < size; i++) {
      std::thread([this, i]() { run(i); }).detach();
    }
    started().store(this, std::memory_order_release);
  }

  static void configureThread(unsigned index) {
    poolThread() = true;
    configureCurrentThread("RNSkia Render " + std::to_string(index + 1),
                           RNSkThreadPriority::kDisplay);
  }

  /**
   The latest idle request and when it was made, with the task to run for
   it. Under the idle lock.
   */
  struct IdleRequest {
    uint64_t id;
    Clock::time_point time;
    std::function<void(bool)> task;
  };

  IdleRequest idleRequest() {
    std::lock_guard<std::mutex> lock(_idleMutex);
    return {_idleRequest, _idleRequestTime, _idleTask};
  }

  void run(unsigned index) {
    configureThread(index);
    auto &worker = *_workers[index];
    // The last idle request this thread served, and when it ran a job last.
    uint64_t served = 0;
    auto lastJob = Clock::now();
    for (;;) {
      std::function<void()> job;
      std::function<void(bool)> idleTask;
      bool idle = false;
      {
        std::unique_lock<std::mutex> lock(worker.mutex);
        for (;;) {
          if (!worker.jobs.empty()) {
            job = std::move(worker.jobs.front());
            worker.jobs.pop_front();
            break;
          }
          // Read while the worker lock is held: requestIdleTask() takes it
          // to notify, so a request cannot land between this read and the
          // wait below unnoticed.
          const auto request = idleRequest();
          if (request.id == served) {
            worker.condition.wait(lock);
            continue;
          }
          const auto due = request.time + kIdleDelay;
          const auto now = Clock::now();
          if (now < due) {
            worker.condition.wait_until(lock, due);
            continue;
          }
          served = request.id;
          idleTask = request.task;
          idle = now - lastJob >= kIdleDelay;
          break;
        }
      }
      if (job) {
        job();
        lastJob = Clock::now();
      } else if (idleTask) {
        idleTask(idle);
      }
    }
  }

  // One per thread; never resized once the threads run.
  std::vector<std::unique_ptr<Worker>> _workers;

  // How many views hold each lane (see acquireLane).
  std::mutex _lanesMutex;
  std::vector<size_t> _views;

  // The idle task and the latest request for it (see requestIdleTask).
  std::mutex _idleMutex;
  std::function<void(bool)> _idleTask;
  uint64_t _idleRequest = 0;
  Clock::time_point _idleRequestTime;
};

} // namespace RNSkia
