// Host-side check of RNSkia::Dispatcher (see run.sh): a surface handed to the
// dispatcher of the thread that made it is destroyed on that thread, by the
// thread's loop when the thread is bound to one, and otherwise the next time
// the thread runs its queue.

#include <atomic>
#include <chrono>
#include <condition_variable>
#include <cstdio>
#include <cstdlib>
#include <functional>
#include <future>
#include <memory>
#include <mutex>
#include <queue>
#include <thread>
#include <utility>
#include <vector>

#include "api/JsiSkDispatcher.h"

using RNSkia::Dispatcher;
using namespace std::chrono_literals;

static int fail(const char *message) {
  std::fprintf(stderr, "FAIL: %s\n", message);
  return 1;
}

namespace {

// A thread that runs what is posted to it, in order, as the JS thread and the
// main thread run their loops.
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

  Dispatcher::Scheduler scheduler() {
    return [this](Dispatcher::Operation operation) {
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

// Stands in for a Graphite surface: runs `onDestroy` on the thread that
// destroys it.
class Surface {
public:
  explicit Surface(std::function<void()> onDestroy)
      : _onDestroy(std::move(onDestroy)) {}
  ~Surface() { _onDestroy(); }

private:
  std::function<void()> _onDestroy;
};

// A surface that tells which thread destroyed it.
struct WatchedSurface {
  std::shared_ptr<Surface> surface;
  std::shared_future<std::thread::id> destroyedOn;
};

WatchedSurface makeWatchedSurface() {
  auto promise = std::make_shared<std::promise<std::thread::id>>();
  auto destroyedOn = promise->get_future().share();
  auto surface = std::make_shared<Surface>(
      [promise]() { promise->set_value(std::this_thread::get_id()); });
  return {std::move(surface), std::move(destroyedOn)};
}

WatchedSurface makeWatchedSurfaceOn(Loop &loop) {
  WatchedSurface watched;
  loop.runAndWait([&]() { watched = makeWatchedSurface(); });
  return watched;
}

bool destroyedWithin(const WatchedSurface &watched,
                     std::chrono::milliseconds timeout) {
  return watched.destroyedOn.wait_for(timeout) == std::future_status::ready;
}

bool destroyedOnWithin(const WatchedSurface &watched, std::thread::id thread,
                       std::chrono::milliseconds timeout) {
  return destroyedWithin(watched, timeout) &&
         watched.destroyedOn.get() == thread;
}

} // namespace

int main() {
  Loop jsThread;
  std::shared_ptr<Dispatcher> jsDispatcher;
  jsThread.runAndWait([&]() {
    Dispatcher::bindCurrentThread(jsThread.scheduler());
    jsDispatcher = Dispatcher::getDispatcher();
  });

  // dispose() on the thread that made the surface destroys it right away.
  {
    bool destroyedAtOnce = false;
    jsThread.runAndWait([&]() {
      auto watched = makeWatchedSurface();
      jsDispatcher->release(std::move(watched.surface));
      destroyedAtOnce = destroyedWithin(watched, 0ms);
    });
    if (!destroyedAtOnce) {
      return fail("a surface let go of on its own thread is not destroyed "
                  "right away");
    }
  }

  // Let go of on another thread, as by a worklet's dispose() or the
  // collector's finalizer: the thread's loop destroys it, without the thread
  // working with a surface again.
  {
    auto watched = makeWatchedSurfaceOn(jsThread);
    jsDispatcher->release(std::move(watched.surface));
    if (!destroyedWithin(watched, 5s)) {
      return fail("a surface let go of on another thread waits for its "
                  "thread to work with a surface");
    }
    if (!destroyedOnWithin(watched, jsThread.id(), 0ms)) {
      return fail("a surface let go of on another thread is not destroyed on "
                  "the thread that made it");
    }
  }

  // Let go of from many threads at once, as the collector finalizes a batch.
  {
    constexpr int kReleasers = 8;
    constexpr int kSurfacesPerReleaser = 50;
    std::vector<WatchedSurface> watched;
    for (int index = 0; index < kReleasers * kSurfacesPerReleaser; index++) {
      watched.push_back(makeWatchedSurfaceOn(jsThread));
    }
    std::vector<std::thread> releasers;
    for (int releaser = 0; releaser < kReleasers; releaser++) {
      releasers.emplace_back([&, releaser]() {
        for (int index = 0; index < kSurfacesPerReleaser; index++) {
          jsDispatcher->release(std::move(
              watched[releaser * kSurfacesPerReleaser + index].surface));
        }
      });
    }
    for (auto &releaser : releasers) {
      releaser.join();
    }
    for (const auto &surface : watched) {
      if (!destroyedOnWithin(surface, jsThread.id(), 5s)) {
        return fail("a surface let go of from many threads at once is not "
                    "destroyed on the thread that made it");
      }
    }
  }

  // A run that takes the queue before run() returns, as a loop already
  // waiting for it does, leaves no reference to the surface on the thread
  // that let go of it.
  {
    Loop waitingThread;
    std::shared_ptr<Dispatcher> waitingDispatcher;
    waitingThread.runAndWait([&]() {
      Dispatcher::bindCurrentThread(
          [&waitingThread](Dispatcher::Operation operation) {
            waitingThread.runAndWait(operation);
            return true;
          });
      waitingDispatcher = Dispatcher::getDispatcher();
    });
    auto watched = makeWatchedSurfaceOn(waitingThread);
    waitingDispatcher->release(std::move(watched.surface));
    if (!destroyedOnWithin(watched, waitingThread.id(), 5s)) {
      return fail("a surface whose run starts before run() returns is "
                  "destroyed on the thread that let go of it");
    }
  }

  // A thread bound to no loop, as a worklet runtime's, destroys what it is
  // handed the next time it runs its queue, and not before; another thread
  // running that queue runs nothing.
  Loop workletThread;
  std::shared_ptr<Dispatcher> workletDispatcher;
  workletThread.runAndWait(
      [&]() { workletDispatcher = Dispatcher::getDispatcher(); });
  {
    auto watched = makeWatchedSurfaceOn(workletThread);
    workletDispatcher->release(std::move(watched.surface));
    if (destroyedWithin(watched, 100ms)) {
      return fail("a thread bound to no loop destroyed a surface before it "
                  "ran its queue");
    }
    if (workletDispatcher->processQueue() != 0 ||
        destroyedWithin(watched, 0ms)) {
      return fail("another thread ran the queue of a thread");
    }
    workletThread.runAndWait([&]() { workletDispatcher->processQueue(); });
    if (!destroyedOnWithin(watched, workletThread.id(), 0ms)) {
      return fail("a thread bound to no loop does not destroy the surface "
                  "when it runs its queue");
    }
  }

  // What a thread was handed before it is bound to its loop, as the main
  // thread is until the module's install reaches it, is destroyed when it is.
  {
    auto watched = makeWatchedSurfaceOn(workletThread);
    workletDispatcher->release(std::move(watched.surface));
    workletThread.runAndWait(
        [&]() { Dispatcher::bindCurrentThread(workletThread.scheduler()); });
    if (!destroyedOnWithin(watched, workletThread.id(), 0ms)) {
      return fail("a thread does not destroy what it was handed when it is "
                  "bound to its loop");
    }
    auto next = makeWatchedSurfaceOn(workletThread);
    workletDispatcher->release(std::move(next.surface));
    if (!destroyedOnWithin(next, workletThread.id(), 5s)) {
      return fail("a thread bound to its loop does not destroy what it is "
                  "handed next");
    }
  }

  // Releases made while the loop is busy post one run of the queue, which
  // destroys every one of them.
  {
    Loop uiThread;
    std::atomic<int> posts{0};
    std::shared_ptr<Dispatcher> uiDispatcher;
    uiThread.runAndWait([&]() {
      Dispatcher::bindCurrentThread([&](Dispatcher::Operation operation) {
        posts++;
        uiThread.post(std::move(operation));
        return true;
      });
      uiDispatcher = Dispatcher::getDispatcher();
    });
    std::vector<WatchedSurface> watched;
    for (int index = 0; index < 100; index++) {
      watched.push_back(makeWatchedSurfaceOn(uiThread));
    }
    std::promise<void> unblock;
    auto unblocked = unblock.get_future().share();
    uiThread.post([unblocked]() { unblocked.wait(); });
    for (auto &surface : watched) {
      uiDispatcher->release(std::move(surface.surface));
    }
    if (posts != 1) {
      return fail("releases made while the loop is busy post more than one "
                  "run of the queue");
    }
    unblock.set_value();
    for (const auto &surface : watched) {
      if (!destroyedOnWithin(surface, uiThread.id(), 5s)) {
        return fail("the run of the queue posted for releases made while the "
                    "loop is busy leaves one of them behind");
      }
    }
  }

  // A release made while the queue runs is not left behind: it posts a run
  // of its own.
  {
    std::promise<void> running;
    auto runningFuture = running.get_future();
    std::promise<void> released;
    auto releasedFuture = released.get_future().share();
    std::shared_ptr<Surface> blocking;
    jsThread.runAndWait([&]() {
      blocking = std::make_shared<Surface>([&running, releasedFuture]() {
        running.set_value();
        releasedFuture.wait();
      });
    });
    auto watched = makeWatchedSurfaceOn(jsThread);
    jsDispatcher->release(std::move(blocking));
    runningFuture.wait();
    jsDispatcher->release(std::move(watched.surface));
    released.set_value();
    if (!destroyedOnWithin(watched, jsThread.id(), 5s)) {
      return fail("a surface let go of while the queue runs is left behind");
    }
  }

  // A scheduler that runs the operation at once when called on its own
  // thread, as Android's main thread does, runs the queue from run() itself.
  {
    Loop mainThread;
    std::promise<bool> ranAtOnce;
    auto ranAtOnceFuture = ranAtOnce.get_future();
    mainThread.post([&]() {
      Dispatcher::bindCurrentThread(
          [&mainThread](Dispatcher::Operation operation) {
            if (std::this_thread::get_id() == mainThread.id()) {
              operation();
            } else {
              mainThread.post(std::move(operation));
            }
            return true;
          });
      bool ran = false;
      Dispatcher::getDispatcher()->run([&ran]() { ran = true; });
      ranAtOnce.set_value(ran);
    });
    if (ranAtOnceFuture.wait_for(5s) != std::future_status::ready) {
      std::fprintf(stderr, "FAIL: run() deadlocks on a scheduler that runs "
                           "the operation at once\n");
      std::_Exit(1);
    }
    if (!ranAtOnceFuture.get()) {
      return fail("run() on a scheduler that runs the operation at once does "
                  "not run the queue");
    }
  }

  // A thread bound again, as the main thread is by each install, destroys
  // what its old scheduler dropped and posts through its new one.
  {
    Loop reboundThread;
    std::shared_ptr<Dispatcher> reboundDispatcher;
    reboundThread.runAndWait([&]() {
      Dispatcher::bindCurrentThread([](Dispatcher::Operation) { return true; });
      reboundDispatcher = Dispatcher::getDispatcher();
    });
    auto dropped = makeWatchedSurfaceOn(reboundThread);
    reboundDispatcher->release(std::move(dropped.surface));
    if (destroyedWithin(dropped, 100ms)) {
      return fail("a scheduler that drops the run destroyed the surface");
    }
    reboundThread.runAndWait(
        [&]() { Dispatcher::bindCurrentThread(reboundThread.scheduler()); });
    if (!destroyedOnWithin(dropped, reboundThread.id(), 0ms)) {
      return fail("a thread bound again does not destroy what it was handed");
    }
    auto next = makeWatchedSurfaceOn(reboundThread);
    reboundDispatcher->release(std::move(next.surface));
    if (!destroyedOnWithin(next, reboundThread.id(), 5s)) {
      return fail("a thread bound again does not post through its new "
                  "scheduler");
    }
  }

  // A post that failed is made again by the next call: what the queue held
  // then runs on the thread's loop.
  {
    Loop recoveringThread;
    std::atomic<int> attempts{0};
    std::shared_ptr<Dispatcher> recoveringDispatcher;
    recoveringThread.runAndWait([&]() {
      Dispatcher::bindCurrentThread([&](Dispatcher::Operation operation) {
        if (attempts++ == 0) {
          return false;
        }
        recoveringThread.post(std::move(operation));
        return true;
      });
      recoveringDispatcher = Dispatcher::getDispatcher();
    });
    auto stranded = makeWatchedSurfaceOn(recoveringThread);
    recoveringDispatcher->release(std::move(stranded.surface));
    auto next = makeWatchedSurfaceOn(recoveringThread);
    recoveringDispatcher->release(std::move(next.surface));
    if (!destroyedOnWithin(stranded, recoveringThread.id(), 5s) ||
        !destroyedOnWithin(next, recoveringThread.id(), 5s)) {
      return fail("a post that failed leaves the queue waiting for good");
    }
  }

  // A posted run does not keep its dispatcher alive once the thread that
  // made it has ended and nothing else holds it.
  {
    std::vector<Dispatcher::Operation> posted;
    std::mutex postedMutex;
    std::shared_ptr<Dispatcher> endedDispatcher;
    WatchedSurface watched;
    std::thread endedThread([&]() {
      Dispatcher::bindCurrentThread([&](Dispatcher::Operation operation) {
        std::lock_guard<std::mutex> lock(postedMutex);
        posted.push_back(std::move(operation));
        return true;
      });
      endedDispatcher = Dispatcher::getDispatcher();
      watched = makeWatchedSurface();
    });
    endedThread.join();
    endedDispatcher->release(std::move(watched.surface));
    std::weak_ptr<Dispatcher> observed = endedDispatcher;
    endedDispatcher.reset();
    if (!observed.expired()) {
      return fail("a posted run keeps its dispatcher alive");
    }
    for (auto &operation : posted) {
      operation();
    }
  }

  std::printf("DispatcherTest: passed\n");
  return 0;
}
