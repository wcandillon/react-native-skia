#pragma once

#include <algorithm>
#include <chrono>
#include <cstdint>
#include <deque>
#include <functional>
#include <mutex>
#include <optional>
#include <string>
#include <thread>
#include <utility>

#include <condition_variable>

#if defined(__APPLE__)
#include <pthread.h>
#include <pthread/qos.h>
#elif defined(__ANDROID__)
#include <pthread.h>
#include <sys/resource.h>
#include <unistd.h>
#endif

namespace RNSkia {

/**
 * When one thread of RNSkThreadPool runs the pool's idle task, and whether it
 * runs it idle (see RNSkThreadPool::setIdleTask). The task is due the delay
 * after the latest request the thread has not served. A thread that runs it
 * busy owes it a run once it ran no job for the delay, and each job puts that
 * run off: the jobs of the views a request comes from can still be running
 * when it is made. The caller passes the times; it reads no clock.
 */
class RNSkIdleTaskSchedule {
public:
  using Clock = std::chrono::steady_clock;

  /** For a thread that starts at `start`, with no job run yet. */
  RNSkIdleTaskSchedule(Clock::duration delay, Clock::time_point start)
      : _delay(delay), _lastJobEnd(start) {}

  /**
   When the thread runs the idle task next, or nothing while it owes no run:
   `requests` counts the requests made so far, the latest at `requestTime`.
   */
  std::optional<Clock::time_point> due(uint64_t requests,
                                       Clock::time_point requestTime) const {
    if (requests != _servedRequests) {
      return requestTime + _delay;
    }
    if (_idleRunOwed) {
      return _lastJobEnd + _delay;
    }
    return std::nullopt;
  }

  /**
   The thread runs the idle task at `now`, which serves `requests`. Returns
   whether it runs it idle; run busy, it owes the task an idle run.
   */
  bool run(uint64_t requests, Clock::time_point now) {
    _servedRequests = requests;
    const bool idle = now - _lastJobEnd >= _delay;
    _idleRunOwed = !idle;
    return idle;
  }

  /** The thread finished a job at `now`. */
  void ranJob(Clock::time_point now) { _lastJobEnd = now; }

private:
  const Clock::duration _delay;
  uint64_t _servedRequests = 0;
  bool _idleRunOwed = false;
  Clock::time_point _lastJobEnd;
};

/**
 * The threads that replay recordings for SkiaGraphiteViews, so that neither
 * the JS thread nor the UI thread pays for a frame. Jobs run in submission
 * order on the first free thread; a view never has more than one job in
 * flight, so views are what run in parallel.
 *
 * Each thread also runs an idle task, on itself, when asked to (see
 * requestIdleTask): the threads cache GPU resources in Graphite recorders of
 * their own, which only their own thread may touch.
 */
class RNSkThreadPool {
public:
  /**
   How long after requestIdleTask() the threads run the idle task, and how
   long a thread runs no job before it counts as idle.
   */
  static constexpr std::chrono::seconds kIdleDelay{2};

  static RNSkThreadPool &getInstance() {
    // Never destroyed: the threads are detached and the process takes them
    // down, which spares the static destructor from joining them at exit.
    static auto *instance = new RNSkThreadPool();
    return *instance;
  }

  RNSkThreadPool(const RNSkThreadPool &) = delete;
  RNSkThreadPool &operator=(const RNSkThreadPool &) = delete;

  void post(std::function<void()> job) {
    {
      std::lock_guard<std::mutex> lock(_mutex);
      _jobs.push_back(std::move(job));
    }
    _condition.notify_one();
  }

  /**
   The task every thread runs, on itself, after requestIdleTask(). `idle`
   says whether the thread ran no job for kIdleDelay: it records nothing for
   now, and whatever it caches can go. A thread that runs it busy runs it
   again, idle, once it ran no job for kIdleDelay (see RNSkIdleTaskSchedule).
   */
  void setIdleTask(std::function<void(bool idle)> task) {
    std::lock_guard<std::mutex> lock(_mutex);
    _idleTask = std::move(task);
  }

  /**
   Asks every thread to run the idle task kIdleDelay from now, as soon as no
   job is waiting: a thread busy with jobs runs it between two of them, once
   the queue is empty. Requests add up: one run serves every request a thread
   has not served, kIdleDelay after the latest. Any thread.
   */
  void requestIdleTask() {
    {
      std::lock_guard<std::mutex> lock(_mutex);
      _idleRequest++;
      _idleRequestTime = Clock::now();
    }
    _condition.notify_all();
  }

private:
  using Clock = std::chrono::steady_clock;

  RNSkThreadPool() {
    auto cores = std::thread::hardware_concurrency();
    const unsigned size = cores == 0 ? 2u : std::clamp(cores / 2, 2u, 4u);
    for (unsigned i = 0; i < size; i++) {
      std::thread([this, i]() { run(i); }).detach();
    }
  }

  static void configureThread(unsigned index) {
    auto name = "RNSkia Render " + std::to_string(index + 1);
#if defined(__APPLE__)
    pthread_setname_np(name.c_str());
    // Frames are presented on the next vsync: the same class the UI uses.
    pthread_set_qos_class_self_np(QOS_CLASS_USER_INTERACTIVE, 0);
#elif defined(__ANDROID__)
    pthread_setname_np(pthread_self(), name.c_str());
    // ANDROID_PRIORITY_DISPLAY; with PRIO_PROCESS and who = 0, Linux applies
    // the nice value to the calling thread only.
    setpriority(PRIO_PROCESS, 0, -4);
#endif
  }

  void run(unsigned index) {
    configureThread(index);
    RNSkIdleTaskSchedule schedule(kIdleDelay, Clock::now());
    for (;;) {
      std::function<void()> job;
      std::function<void(bool)> idleTask;
      bool idle = false;
      {
        std::unique_lock<std::mutex> lock(_mutex);
        for (;;) {
          if (!_jobs.empty()) {
            job = std::move(_jobs.front());
            _jobs.pop_front();
            break;
          }
          const auto due = schedule.due(_idleRequest, _idleRequestTime);
          if (!due) {
            _condition.wait(lock);
            continue;
          }
          const auto now = Clock::now();
          if (now < *due) {
            _condition.wait_until(lock, *due);
            continue;
          }
          idleTask = _idleTask;
          idle = schedule.run(_idleRequest, now);
          break;
        }
      }
      if (job) {
        job();
        schedule.ranJob(Clock::now());
      } else if (idleTask) {
        idleTask(idle);
      }
    }
  }

  std::mutex _mutex;
  std::condition_variable _condition;
  std::deque<std::function<void()>> _jobs;
  // The idle task and the latest request for it (see requestIdleTask).
  std::function<void(bool)> _idleTask;
  uint64_t _idleRequest = 0;
  Clock::time_point _idleRequestTime;
};

} // namespace RNSkia
