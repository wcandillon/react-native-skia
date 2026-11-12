// Host-side check of rnsurface::RenderThread (see run.sh): tasks run on the
// thread, in order, never on the spot; a bounded wait returns in time, or
// marks the thread held up until its task runs, once per hold-up.

#define RNSURFACE_THREAD_CHECK_ABORTS 0

#include <atomic>
#include <chrono>
#include <cstdio>
#include <future>
#include <thread>
#include <vector>

#include "rnsurface/RenderThread.h"

namespace {

using namespace std::chrono_literals;
using rnsurface::RenderThread;

int failures = 0;

void expect(bool condition, const char *what) {
  if (!condition) {
    std::fprintf(stderr, "FAIL: %s\n", what);
    failures++;
  }
}

// Posts a marker and waits for it: everything posted before has run.
bool settle(RenderThread &thread) {
  const bool settled = thread.postAndWait([]() {}, 5s);
  expect(settled, "the thread drains");
  return settled;
}

} // namespace

int main() {
  alarm(60);
  {
    std::vector<int> order;
    std::thread::id ranOn;
    RenderThread thread("test");
    expect(!thread.isCurrent(), "the caller is not the thread");
    thread.post([&]() {
      ranOn = std::this_thread::get_id();
      order.push_back(1);
    });
    thread.post([&]() { order.push_back(2); });
    if (settle(thread)) {
      expect(ranOn == std::thread::id() ? false
                                        : ranOn != std::this_thread::get_id(),
             "a post never runs on the caller thread");
      expect(order == std::vector<int>({1, 2}), "tasks run in order");
    }
  }
  {
    // A task posted from the thread itself runs after the one posting it.
    std::vector<int> order;
    std::promise<void> nestedPosted;
    auto posted = nestedPosted.get_future();
    RenderThread thread("test");
    thread.post([&]() {
      thread.post([&]() { order.push_back(2); });
      expect(order.empty(), "a post from the thread does not run on the spot");
      expect(thread.isCurrent(), "a task sees itself on the thread");
      order.push_back(1);
      nestedPosted.set_value();
    });
    // The marker must be after the nested task, not merely after the task
    // that will post it. Its completion then synchronizes the vector read.
    const bool nestedWasPosted =
        posted.wait_for(5s) == std::future_status::ready;
    expect(nestedWasPosted, "the outer task posts the nested task");
    if (nestedWasPosted && settle(thread)) {
      expect(order == std::vector<int>({1, 2}), "a nested post runs after");
    }
  }
  {
    // The checker is bound to the thread.
    rnsurface::ThreadChecker::Site site;
    bool passedOnThread = false;
    RenderThread thread("test");
    thread.post(
        [&]() { passedOnThread = thread.checker().assertCurrent(site, "on"); });
    if (settle(thread)) {
      expect(passedOnThread, "the entry check passes on the thread");
      rnsurface::ThreadChecker::Site other;
      expect(!thread.checker().assertCurrent(other, "off"),
             "the entry check fails off the thread");
    }
  }
  {
    // A bounded wait: in time, then held up by a slow task, once per hold-up.
    std::atomic<bool> release{false};
    bool ran = false;
    bool secondRan = false;
    RenderThread thread("test");
    expect(thread.postAndWait([]() {}, 1s),
           "a quick task runs within the bound");
    expect(!thread.isHeldUp(), "not held up after a wait that made it");

    thread.post([&]() {
      while (!release.load()) {
        std::this_thread::sleep_for(1ms);
      }
    });
    // The present in flight (above) holds the thread: the wait times out.
    const auto before = std::chrono::steady_clock::now();
    expect(!thread.postAndWait([&]() { ran = true; }, 50ms),
           "a wait behind a slow task times out");
    expect(thread.isHeldUp(), "a timed-out wait marks the thread held up");
    expect(!ran, "the task waited for has not run yet");

    // Another canvas going meanwhile does not wait at all.
    const auto start = std::chrono::steady_clock::now();
    expect(!thread.postAndWait([&]() { secondRan = true; }, 1s),
           "a wait while held up returns false");
    expect(std::chrono::steady_clock::now() - start < 500ms,
           "a wait while held up returns at once");
    expect(thread.isHeldUp(), "a wait skipped keeps the mark");

    release.store(true);
    // The mark goes down with the task waited for, not with the wait: a
    // settle would return at once while it is up.
    const auto deadline = std::chrono::steady_clock::now() + 5s;
    while (thread.isHeldUp() && std::chrono::steady_clock::now() < deadline) {
      std::this_thread::sleep_for(1ms);
    }
    expect(!thread.isHeldUp(), "the task waited for takes the mark down");
    if (settle(thread)) {
      expect(ran && secondRan, "the tasks ran once the thread was free");
    }
    (void)before;
  }
  {
    // The destructor runs what is queued before it stops. Repeating it makes
    // this also exercise shutdown while a prior queue wakeup is in flight.
    int ran = 0;
    for (int i = 0; i < 100; ++i) {
      RenderThread thread("test");
      thread.post([&]() { ran++; });
    }
    expect(ran == 100, "a task posted before the stop runs");
  }
  if (failures == 0) {
    std::printf("RenderThreadTest: passed\n");
    return 0;
  }
  std::fprintf(stderr, "RenderThreadTest: %d failure(s)\n", failures);
  return 1;
}
