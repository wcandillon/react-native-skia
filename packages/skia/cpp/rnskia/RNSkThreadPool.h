#pragma once

#include <algorithm>
#include <chrono>
#include <condition_variable>
#include <cstddef>
#include <cstdint>
#include <deque>
#include <functional>
#include <memory>
#include <mutex>
#include <optional>
#include <string>
#include <thread>
#include <utility>
#include <vector>

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
 * after the first request the thread has not served: later ones do not put
 * it off, and one run serves them all, but for those a busy run is too soon
 * for (made less than the delay before it), which it runs again for, the
 * delay after the latest. A thread that runs it busy owes it a
 * run once it ran no job for the delay, and each job puts that run off: the
 * jobs of the views a request comes from can still be running when it is
 * made. A request does not put it off: the thread runs the task at whichever
 * comes first, and a run it owes is idle, so it serves the request too. The
 * caller passes the times; it reads no clock.
 */
class RNSkIdleTaskSchedule {
public:
  using Clock = std::chrono::steady_clock;

  /** For a thread that starts at `start`, with no job run yet. */
  RNSkIdleTaskSchedule(Clock::duration delay, Clock::time_point start)
      : _delay(delay), _lastJobEnd(start) {}

  /**
   A request is made at `now`. While an earlier one is not served yet, it
   does not put the run off.
   */
  void request(Clock::time_point now) {
    if (!_firstRequest) {
      _firstRequest = now;
    }
    _latestRequest = now;
  }

  /** When the thread runs the idle task next; nothing while it owes none. */
  std::optional<Clock::time_point> due() const {
    std::optional<Clock::time_point> due;
    if (_firstRequest) {
      due = *_firstRequest + _delay;
    }
    if (_idleRunOwed) {
      // Requests keep coming while views come and go on other threads: one
      // made since must not keep this thread, which ran no job, from
      // running the task idle.
      const auto owed = _lastJobEnd + _delay;
      due = due ? std::min(*due, owed) : owed;
    }
    return due;
  }

  /**
   The thread runs the idle task at `now`. Run idle, it serves every request
   made so far. Run busy, it serves those made at least the delay before:
   it lets go only of what went unused for a while, so what went away with
   a later one is still there, and it runs the task again for that one.
   Returns whether it runs it idle; run busy, it owes the task an idle run.
   */
  bool run(Clock::time_point now) {
    const bool idle = now - _lastJobEnd >= _delay;
    if (!idle && _latestRequest && now - *_latestRequest < _delay) {
      _firstRequest = _latestRequest;
    } else {
      _firstRequest.reset();
    }
    _idleRunOwed = !idle;
    return idle;
  }

  /** The thread finished a job at `now`. */
  void ranJob(Clock::time_point now) { _lastJobEnd = now; }

private:
  const Clock::duration _delay;
  // When the first request the thread has not served was made.
  std::optional<Clock::time_point> _firstRequest;
  std::optional<Clock::time_point> _latestRequest;
  bool _idleRunOwed = false;
  Clock::time_point _lastJobEnd;
};

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
  /**
   How long after requestIdleTask() the threads run the idle task, and how
   long a thread runs no job before it counts as idle.
   */
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

  /**
   Whether the calling thread is one of the pool's: those trim the GPU
   resources they cache in their idle task (see RNSkGraphiteProducer), other
   threads after their own submits (see DawnContext::trimThreadIfDue).
   */
  static bool isPoolThread() { return poolThreadFlag(); }

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
   now, and whatever it caches can go. A thread that runs it busy runs it
   again, idle, once it ran no job for kIdleDelay (see RNSkIdleTaskSchedule).
   */
  void setIdleTask(std::function<void(bool idle)> task) {
    std::lock_guard<std::mutex> lock(_idleMutex);
    _idleTask = std::move(task);
  }

  /**
   Asks every thread to run the idle task kIdleDelay from now, as soon as no
   job is waiting on it: a thread busy with jobs runs it between two of
   them, once its queue is empty. Requests add up: one run serves every
   request a thread has not served (a busy one, those at least kIdleDelay
   old), kIdleDelay after the first, so that requests that keep coming do
   not put the run off. Any thread.
   */
  void requestIdleTask() {
    const auto now = Clock::now();
    for (auto &worker : _workers) {
      // Under the worker's lock: a thread reads the request under it before
      // waiting (see run), so the request is either read or waited for.
      std::lock_guard<std::mutex> lock(worker->mutex);
      worker->schedule.request(now);
      worker->condition.notify_all();
    }
  }

private:
  using Clock = std::chrono::steady_clock;

  /** A thread and its lane. */
  struct Worker {
    std::mutex mutex;
    std::condition_variable condition;
    std::deque<std::function<void()>> jobs;
    // When the thread runs the idle task. Under the lock: requestIdleTask()
    // writes to it from any thread. Made before any thread starts.
    RNSkIdleTaskSchedule schedule{kIdleDelay, Clock::now()};
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

  std::function<void(bool)> idleTask() {
    std::lock_guard<std::mutex> lock(_idleMutex);
    return _idleTask;
  }

  static bool &poolThreadFlag() {
    static thread_local bool flag = false;
    return flag;
  }

  void run(unsigned index) {
    poolThreadFlag() = true;
    configureThread(index);
    auto &worker = *_workers[index];
    // When the last job ended, told to the schedule under the next lock.
    std::optional<Clock::time_point> jobEnd;
    for (;;) {
      std::function<void()> job;
      std::function<void(bool)> idleTask;
      bool idle = false;
      {
        std::unique_lock<std::mutex> lock(worker.mutex);
        if (jobEnd) {
          worker.schedule.ranJob(*jobEnd);
          jobEnd.reset();
        }
        for (;;) {
          if (!worker.jobs.empty()) {
            job = std::move(worker.jobs.front());
            worker.jobs.pop_front();
            break;
          }
          // Read while the worker lock is held: requestIdleTask() takes it
          // to notify, so a request cannot land between this read and the
          // wait below unnoticed.
          const auto due = worker.schedule.due();
          if (!due) {
            worker.condition.wait(lock);
            continue;
          }
          const auto now = Clock::now();
          if (now < *due) {
            worker.condition.wait_until(lock, *due);
            continue;
          }
          idleTask = this->idleTask();
          idle = worker.schedule.run(now);
          break;
        }
      }
      if (job) {
        job();
        jobEnd = Clock::now();
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

  // The idle task (see setIdleTask).
  std::mutex _idleMutex;
  std::function<void(bool)> _idleTask;
};

} // namespace RNSkia
