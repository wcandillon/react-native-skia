// Host-side check of rnsurface::RenderThread (see run.sh): tasks run on the
// thread, in order, never on the spot; a bounded wait returns in time, or
// marks the thread held up until its task runs, once per hold-up.

#define RNSURFACE_THREAD_CHECK_ABORTS 0

#include <atomic>
#include <chrono>
#include <cstdio>
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
void settle(RenderThread &thread) {
  expect(thread.postAndWait([]() {}, 5s), "the thread drains");
}

} // namespace

int main() {
  alarm(60);
  {
    RenderThread thread("test");
    expect(!thread.isCurrent(), "the caller is not the thread");
    std::vector<int> order;
    std::thread::id ranOn;
    bool onTheSpot = true;
    thread.post([&]() {
      ranOn = std::this_thread::get_id();
      order.push_back(1);
    });
    onTheSpot = !order.empty();
    thread.post([&]() { order.push_back(2); });
    settle(thread);
    expect(!onTheSpot, "a post never runs on the spot");
    expect(ranOn == std::thread::id() ? false
                                      : ranOn != std::this_thread::get_id(),
           "a task runs on the thread");
    expect(order == std::vector<int>({1, 2}), "tasks run in order");
  }
  {
    // A task posted from the thread itself runs after the one posting it.
    RenderThread thread("test");
    std::vector<int> order;
    thread.post([&]() {
      thread.post([&]() { order.push_back(2); });
      expect(order.empty(), "a post from the thread does not run on the spot");
      expect(thread.isCurrent(), "a task sees itself on the thread");
      order.push_back(1);
    });
    settle(thread);
    expect(order == std::vector<int>({1, 2}), "a nested post runs after");
  }
  {
    // The checker is bound to the thread.
    RenderThread thread("test");
    rnsurface::ThreadChecker::Site site;
    bool passedOnThread = false;
    thread.post(
        [&]() { passedOnThread = thread.checker().assertCurrent(site, "on"); });
    settle(thread);
    expect(passedOnThread, "the entry check passes on the thread");
    rnsurface::ThreadChecker::Site other;
    expect(!thread.checker().assertCurrent(other, "off"),
           "the entry check fails off the thread");
  }
  {
    // A bounded wait: in time, then held up by a slow task, once per hold-up.
    RenderThread thread("test");
    expect(thread.postAndWait([]() {}, 1s),
           "a quick task runs within the bound");
    expect(!thread.isHeldUp(), "not held up after a wait that made it");

    std::atomic<bool> release{false};
    thread.post([&]() {
      while (!release.load()) {
        std::this_thread::sleep_for(1ms);
      }
    });
    // The present in flight (above) holds the thread: the wait times out.
    bool ran = false;
    const auto before = std::chrono::steady_clock::now();
    expect(!thread.postAndWait([&]() { ran = true; }, 50ms),
           "a wait behind a slow task times out");
    expect(thread.isHeldUp(), "a timed-out wait marks the thread held up");
    expect(!ran, "the task waited for has not run yet");

    // Another canvas going meanwhile does not wait at all.
    const auto start = std::chrono::steady_clock::now();
    bool secondRan = false;
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
    settle(thread);
    expect(ran && secondRan, "the tasks ran once the thread was free");
    (void)before;
  }
  {
    // The destructor runs what is queued before it stops.
    bool ran = false;
    {
      RenderThread thread("test");
      thread.post([&]() { ran = true; });
    }
    expect(ran, "a task posted before the stop runs");
  }
  if (failures == 0) {
    std::printf("RenderThreadTest: passed\n");
    return 0;
  }
  std::fprintf(stderr, "RenderThreadTest: %d failure(s)\n", failures);
  return 1;
}
