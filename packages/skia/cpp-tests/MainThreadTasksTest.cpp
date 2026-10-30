// Host-side check of RNSkia::MainThreadTasks (see run.sh). This process's
// first thread stands in for the main thread, and a poll of the eventfd for
// the looper that watches it. The eventfd is Linux's, as on Android and on
// CI's runner; elsewhere the check says it is skipped.

#if defined(__linux__)

#include <poll.h>
#include <sched.h>
#include <unistd.h>

#include <atomic>
#include <cstdio>
#include <thread>
#include <vector>

#include "rnskia-android/RNSkMainThreadTasks.h"

static int fail(const char *message) {
  std::fprintf(stderr, "FAIL: %s\n", message);
  return 1;
}

static bool readable(int descriptor, int timeoutMilliseconds) {
  pollfd watched{descriptor, POLLIN, 0};
  return poll(&watched, 1, timeoutMilliseconds) == 1;
}

static int usableCpus() {
  cpu_set_t cpus;
  return sched_getaffinity(0, sizeof(cpus), &cpus) == 0 ? CPU_COUNT(&cpus) : 1;
}

int main() {
  // A deadlock fails the run rather than hanging it.
  alarm(30);
  auto &tasks = RNSkia::MainThreadTasks::getInstance();
  const auto mainThread = std::this_thread::get_id();
  {
    // A task queued off the main thread onto an empty queue wakes it, and
    // runs there.
    std::thread::id ranOn;
    std::thread([&] {
      tasks.post([&] { ranOn = std::this_thread::get_id(); });
    }).join();
    if (!readable(tasks.wakeup(), 0)) {
      return fail("a task queued off the main thread does not wake it");
    }
    tasks.run();
    if (ranOn != mainThread) {
      return fail("a task queued off the main thread does not run on it");
    }
    if (readable(tasks.wakeup(), 0)) {
      return fail("the wakeup stays readable once the queue has run");
    }
  }
  {
    // A queue that already holds a task is not written again.
    int ran = 0;
    std::thread([&] {
      tasks.post([&] { ran++; });
      tasks.post([&] { ran++; });
    }).join();
    eventfd_t writes = 0;
    eventfd_read(tasks.wakeup(), &writes);
    if (writes != 1) {
      return fail("two tasks queued together write the wakeup twice");
    }
    tasks.run();
    if (ran != 2) {
      return fail("a run does not take every queued task");
    }
  }
  {
    // A task handed over on the main thread runs the queue on the spot,
    // with what other threads queued, and leaves no wakeup behind.
    int ran = 0;
    std::thread([&] { tasks.post([&] { ran++; }); }).join();
    tasks.post([&] { ran++; });
    if (ran != 2) {
      return fail("a task handed over on the main thread does not run the "
                  "queue on the spot");
    }
    if (readable(tasks.wakeup(), 0)) {
      return fail("a wakeup stays readable after the main thread ran the "
                  "queue on the spot");
    }
  }
  {
    // A task queued off the main thread while it runs a batch wakes it
    // again.
    bool queuedDuringBatchRan = false;
    std::thread([&] {
      tasks.post([&] {
        std::thread([&] {
          tasks.post([&] { queuedDuringBatchRan = true; });
        }).join();
      });
    }).join();
    tasks.run();
    if (queuedDuringBatchRan || !readable(tasks.wakeup(), 0)) {
      return fail("a task queued during a batch does not wake the main "
                  "thread again");
    }
    tasks.run();
    if (!queuedDuringBatchRan) {
      return fail("a task queued during a batch does not run");
    }
  }
  if (usableCpus() < 2) {
    std::printf("MainThreadTasksTest: one CPU, so threads queuing while the "
                "main thread runs the queue go unchecked\n");
  } else {
    // Many threads queuing while the main thread runs the queue at each
    // wakeup: no task is left without one.
    constexpr int posters = 8;
    constexpr int tasksPerPoster = 20000;
    std::atomic<int> ran{0};
    std::vector<std::thread> threads;
    for (int poster = 0; poster < posters; poster++) {
      threads.emplace_back([&] {
        for (int task = 0; task < tasksPerPoster; task++) {
          tasks.post([&] { ran++; });
        }
      });
    }
    while (ran < posters * tasksPerPoster) {
      if (!readable(tasks.wakeup(), 1000)) {
        for (auto &thread : threads) {
          thread.join();
        }
        return fail("a queued task is left without a wakeup");
      }
      tasks.run();
    }
    for (auto &thread : threads) {
      thread.join();
    }
  }
  std::printf("MainThreadTasksTest: passed\n");
  return 0;
}

#else

#include <cstdio>

int main() {
  std::printf("MainThreadTasksTest: skipped, it needs Linux's eventfd\n");
  return 0;
}

#endif
