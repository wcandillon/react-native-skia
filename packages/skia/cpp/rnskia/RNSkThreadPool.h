#pragma once

#include <algorithm>
#include <deque>
#include <functional>
#include <mutex>
#include <string>
#include <thread>

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
 * The threads that replay recordings for SkiaGraphiteViews, so that neither
 * the JS thread nor the UI thread pays for a frame. Jobs run in submission
 * order on the first free thread; a view never has more than one job in
 * flight, so views are what run in parallel.
 */
class RNSkThreadPool {
public:
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

private:
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
    for (;;) {
      std::function<void()> job;
      {
        std::unique_lock<std::mutex> lock(_mutex);
        _condition.wait(lock, [this]() { return !_jobs.empty(); });
        job = std::move(_jobs.front());
        _jobs.pop_front();
      }
      job();
    }
  }

  std::mutex _mutex;
  std::condition_variable _condition;
  std::deque<std::function<void()>> _jobs;
};

} // namespace RNSkia
