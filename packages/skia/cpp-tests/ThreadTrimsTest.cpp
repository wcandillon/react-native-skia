// Host-side check of RNSkia::RNSkThreadTrimSchedule and RNSkia::RNSkThreadTrims
// (see run.sh): a thread outside the render pool trims its recorders on itself,
// through its dispatcher, the delay after the latest request for it, idle when
// it ran no GPU work for the delay.

#include <atomic>
#include <chrono>
#include <cstddef>
#include <cstdio>
#include <filesystem>
#include <functional>
#include <future>
#include <memory>
#include <mutex>
#include <thread>
#include <utility>
#include <vector>

#if defined(__linux__)
#include <linux/capability.h>
#include <sys/resource.h>
#include <sys/syscall.h>
#include <sys/wait.h>
#include <unistd.h>
#endif

#include "rnskia/RNSkThreadPool.h"
#include "rnskia/RNSkThreadTrimSchedule.h"
#include "rnskia/RNSkThreadTrims.h"

#include "Loop.h"

using RNSkia::Dispatcher;
using RNSkia::RNSkThreadPool;
using RNSkia::RNSkThreadTrims;
using RNSkia::RNSkThreadTrimSchedule;
using namespace std::chrono_literals;

static int fail(const char *message) {
  std::fprintf(stderr, "FAIL: %s\n", message);
  return 1;
}

namespace {

using Clock = RNSkThreadTrimSchedule::Clock;
using Thread = RNSkThreadTrimSchedule::Thread;

bool hasOnly(const std::vector<Thread> &threads, Thread thread) {
  return threads.size() == 1 && threads.front() == thread;
}

// The schedule decides from the times it is given.
int checkSchedule() {
  const auto delay = 2s;
  RNSkThreadTrimSchedule schedule(delay);
  int jsState = 0;
  int workletState = 0;
  const Thread js = &jsState;
  const Thread worklet = &workletState;
  const auto start = Clock::time_point{} + 1h;

  if (schedule.nextDue().has_value()) {
    return fail("a schedule asked for nothing has a trim due");
  }

  // A request is due the delay after it, and requests add up.
  schedule.request(js, start);
  if (schedule.nextDue() != start + delay) {
    return fail("a request is not due the delay after it");
  }
  schedule.request(js, start + 1s);
  if (schedule.nextDue() != start + 1s + delay) {
    return fail("a later request does not put the trim off to after it");
  }
  if (!schedule.takeDue(start + 1s + delay - 1ms).empty()) {
    return fail("a trim is taken before it is due");
  }
  if (!hasOnly(schedule.takeDue(start + 1s + delay), js)) {
    return fail("the trim that came due is not taken");
  }
  if (schedule.nextDue().has_value() || !schedule.takeDue(start + 1h).empty()) {
    return fail("a trim taken and not run yet is taken again");
  }

  // A request made after its trim was taken, before it ran, is not lost: an
  // idle trim frees what it is about, and a busy one leaves it its own trim.
  schedule.request(js, start + 4s);
  if (schedule.nextDue().has_value()) {
    return fail("a thread whose trim was taken is due before it ran");
  }
  if (!schedule.ran(js, start + 4s)) {
    return fail("a thread that ran no GPU work does not trim idle");
  }
  if (schedule.nextDue().has_value()) {
    return fail("an idle trim leaves a request made before it ran a trim of "
                "its own");
  }
  RNSkThreadTrimSchedule queued(delay);
  queued.request(js, start);
  queued.takeDue(start + delay);
  queued.request(js, start + delay + 1ms);
  queued.ranWork(js, start + delay + 2ms);
  if (queued.ran(js, start + delay + 3ms) ||
      queued.nextDue() != start + 2 * delay + 1ms) {
    return fail("a request made while a busy trim was taken is lost");
  }

  // GPU work puts the thread's own trim off, and no other thread's.
  schedule.request(js, start + 4s);
  schedule.ranWork(worklet, start + 5s);
  if (schedule.nextDue() != start + 4s + delay) {
    return fail("one thread's GPU work puts off another thread's trim");
  }
  if (!hasOnly(schedule.takeDue(start + 4s + delay), js)) {
    return fail("a trim is taken for a thread that is not due");
  }
  schedule.ran(js, start + 4s + delay);
  schedule.ranWork(worklet, start + 6s);
  if (schedule.nextDue() != start + 6s + delay) {
    return fail("GPU work does not put the thread's trim off to after it");
  }

  // GPU work alone has the thread trim, idle, the delay after the latest.
  if (!hasOnly(schedule.takeDue(start + 6s + delay), worklet)) {
    return fail("the trim after GPU work is not taken");
  }
  if (!schedule.ran(worklet, start + 6s + delay)) {
    return fail("a thread that ran no GPU work for the delay trims busy");
  }
  schedule.request(worklet, start + 9s);
  schedule.takeDue(start + 9s + delay);
  if (!schedule.ran(worklet, start + 9s + delay)) {
    return fail("a thread that ran no GPU work for the delay trims busy");
  }

  // A request comes due the delay after it however long its thread keeps
  // running GPU work, which then trims busy, as a render thread does; once the
  // thread stops, its work has it trim again, idle.
  RNSkThreadTrimSchedule drawing(delay);
  drawing.request(js, start);
  auto frame = start;
  for (; frame <= start + delay; frame += 16ms) {
    drawing.ranWork(js, frame);
  }
  if (!hasOnly(drawing.takeDue(start + delay), js)) {
    return fail("GPU work puts off the trim a request asked for");
  }
  if (drawing.ran(js, start + delay)) {
    return fail("a thread that kept running GPU work trims idle");
  }
  for (; frame <= start + 3 * delay; frame += 16ms) {
    drawing.ranWork(js, frame);
  }
  if (!drawing.takeDue(frame - 16ms + delay - 1ms).empty() ||
      !hasOnly(drawing.takeDue(frame - 16ms + delay), js) ||
      !drawing.ran(js, frame - 16ms + delay)) {
    return fail("a thread that stopped running GPU work does not trim idle "
                "the delay after it");
  }

  // A trim a request asked for that runs busy, its thread having run GPU
  // work within the delay, leaves that work to the idle trim the delay after
  // it.
  RNSkThreadTrimSchedule busy(delay);
  busy.request(js, start);
  busy.ranWork(js, start + delay - 100ms);
  if (!hasOnly(busy.takeDue(start + delay), js) ||
      busy.ran(js, start + delay) ||
      busy.nextDue() != start + delay - 100ms + delay) {
    return fail("a trim that ran busy leaves its thread's work to no trim");
  }

  // A trim after which the thread still keeps something another holder holds
  // has it trim again the delay after it, then twice as long after each trim
  // after which it still does, up to the most doublings; one after which it
  // keeps nothing ends it.
  RNSkThreadTrimSchedule holding(delay);
  holding.request(js, start);
  auto trimAt = start + delay;
  auto wait = Clock::duration(delay);
  for (int trim = 0; trim <= RNSkThreadTrimSchedule::kMaxFollowUpDoublings + 1;
       trim++) {
    if (!hasOnly(holding.takeDue(trimAt), js)) {
      return fail("a thread that still keeps something another holder holds "
                  "does not trim again");
    }
    holding.ran(js, trimAt);
    if (holding.nextDue().has_value() && *holding.nextDue() <= trimAt) {
      return fail("a trim is due again before the one it served reported");
    }
    holding.trimmed(js, trimAt, false, true);
    if (holding.nextDue() != trimAt + wait) {
      return fail("the wait for the trim after one the thread still kept "
                  "something after does not double up to its most");
    }
    trimAt += wait;
    if (trim < RNSkThreadTrimSchedule::kMaxFollowUpDoublings) {
      wait *= 2;
    }
  }
  holding.takeDue(trimAt);
  holding.ran(js, trimAt);
  holding.trimmed(js, trimAt, false, false);
  if (holding.nextDue().has_value()) {
    return fail("a trim after which the thread keeps nothing asks for another");
  }

  // A trim taken before a request is due leaves that request its own trim:
  // what it asked for may have come back too recently for a busy trim.
  RNSkThreadTrimSchedule early(delay);
  early.request(js, start);
  early.ranWork(js, start + 1900ms);
  early.takeDue(start + delay);
  early.ran(js, start + delay);
  early.trimmed(js, start + delay, false, true);
  early.request(js, start + 3500ms);
  early.ranWork(js, start + 3900ms);
  if (!hasOnly(early.takeDue(start + 2 * delay), js) ||
      early.ran(js, start + 2 * delay)) {
    return fail("the trim after a trim that still held something is not "
                "taken busy");
  }
  early.trimmed(js, start + 2 * delay, false, false);
  if (early.nextDue() != start + 3500ms + delay) {
    return fail("a trim taken before a request was due serves it");
  }

  // What a holding lets go of at a trim comes back during it, too recently
  // for a busy trim: it keeps a trim of its own the delay after, which a trim
  // taken before then, for a request made before the let-go, does not serve.
  RNSkThreadTrimSchedule letGo(delay);
  const auto letGoAt = start + delay;
  letGo.held(js, start);
  letGo.request(js, start + 500ms);
  letGo.ranWork(js, letGoAt - 100ms);
  if (!hasOnly(letGo.takeDue(letGoAt), js) || letGo.ran(js, letGoAt)) {
    return fail("the trim a hold asked for is not taken busy");
  }
  letGo.trimmed(js, letGoAt, true, false);
  auto drawn = letGoAt;
  for (; drawn <= letGoAt + 500ms; drawn += 16ms) {
    letGo.ranWork(js, drawn);
  }
  if (!letGo.takeDue(letGoAt + 500ms).empty()) {
    letGo.ran(js, letGoAt + 500ms);
    letGo.trimmed(js, letGoAt + 500ms, false, false);
  }
  for (; drawn <= letGoAt + 2 * delay; drawn += 16ms) {
    letGo.ranWork(js, drawn);
  }
  if (!hasOnly(letGo.takeDue(letGoAt + delay), js)) {
    return fail("a trim taken before a let-go's own trim was due serves it");
  }

  // A let-go restarts the doubling wait for what the thread still keeps: the
  // holders around it may let go soon too.
  RNSkThreadTrimSchedule letGoRestart(delay);
  letGoRestart.held(js, start);
  auto restartedAt = start + delay;
  for (int trim = 0; trim <= RNSkThreadTrimSchedule::kMaxFollowUpDoublings;
       trim++) {
    letGoRestart.takeDue(restartedAt);
    letGoRestart.ran(js, restartedAt);
    letGoRestart.trimmed(js, restartedAt, false, true);
    restartedAt = *letGoRestart.nextDue();
  }
  letGoRestart.takeDue(restartedAt);
  letGoRestart.ran(js, restartedAt);
  letGoRestart.trimmed(js, restartedAt, true, true);
  restartedAt += delay;
  if (!hasOnly(letGoRestart.takeDue(restartedAt), js)) {
    return fail("a trim that let go of something has no trim the delay after");
  }
  letGoRestart.ran(js, restartedAt);
  letGoRestart.trimmed(js, restartedAt, false, true);
  if (letGoRestart.nextDue() != restartedAt + 2 * delay) {
    return fail("a let-go does not restart the doubling wait for what the "
                "thread still keeps");
  }

  // A new holding is polled the delay after it, sooner than the doubled wait
  // of the trims after one that still held something, and restarts that wait.
  RNSkThreadTrimSchedule restart(delay);
  restart.request(js, start);
  auto restartAt = start + delay;
  auto lastTrimAt = restartAt;
  for (int trim = 0; trim <= RNSkThreadTrimSchedule::kMaxFollowUpDoublings;
       trim++) {
    restart.takeDue(restartAt);
    restart.ran(js, restartAt);
    restart.trimmed(js, restartAt, false, true);
    lastTrimAt = restartAt;
    restartAt = *restart.nextDue();
  }
  restartAt = lastTrimAt + 2 * delay;
  restart.held(js, lastTrimAt + delay);
  if (restart.nextDue() != restartAt) {
    return fail("a new holding is not polled the delay after it");
  }
  restart.takeDue(restartAt);
  restart.ran(js, restartAt);
  restart.trimmed(js, restartAt, false, true);
  if (restart.nextDue() != restartAt + delay) {
    return fail("a new holding does not restart the wait for the trim after "
                "one that still held something");
  }

  // A trim whose post failed stays taken, and its post is made again the
  // delay after, until the trim runs.
  RNSkThreadTrimSchedule unposted(delay);
  unposted.request(js, start);
  unposted.takeDue(start + delay);
  unposted.postFailed(js, start + delay);
  if (unposted.nextDue() != start + 2 * delay ||
      !unposted.takeDue(start + 2 * delay).empty() ||
      !hasOnly(unposted.takeReposts(start + 2 * delay), js) ||
      unposted.nextDue().has_value()) {
    return fail("a trim whose post failed is not posted again the delay after");
  }
  unposted.postFailed(js, start + 2 * delay);
  unposted.ran(js, start + 2 * delay + 1s);
  if (unposted.nextDue().has_value() ||
      !unposted.takeReposts(start + 1h).empty()) {
    return fail("a trim that ran is posted again");
  }
  unposted.request(js, start + 1h);
  unposted.postFailed(js, start + 1h);
  if (unposted.nextDue() != start + 1h + delay ||
      !unposted.takeReposts(start + 2h).empty()) {
    return fail("a thread whose trim is not taken has a post made again");
  }

  // A thread that ended goes: nothing comes due for it, and a trim already
  // handed to it trims idle.
  schedule.request(js, start + 20s);
  schedule.forget(js);
  if (schedule.nextDue().has_value()) {
    return fail("a thread that ended still has a trim due");
  }
  if (!schedule.ran(js, start + 30s) || schedule.nextDue().has_value()) {
    return fail("a trim for a thread that ended brings the thread back");
  }
  return 0;
}

// What the trims ran: on which thread, whether idle, and when.
class TrimLog {
public:
  void add(bool idle) {
    std::lock_guard<std::mutex> lock(_mutex);
    _trims.push_back({std::this_thread::get_id(), idle, Clock::now()});
  }

  size_t countOn(std::thread::id thread) {
    return countOnSince(thread, Clock::time_point::min());
  }

  size_t countOnSince(std::thread::id thread, Clock::time_point since) {
    std::lock_guard<std::mutex> lock(_mutex);
    size_t count = 0;
    for (const auto &trim : _trims) {
      count += trim.thread == thread && trim.at >= since ? 1 : 0;
    }
    return count;
  }

  size_t count() {
    std::lock_guard<std::mutex> lock(_mutex);
    return _trims.size();
  }

  size_t busyCountOn(std::thread::id thread) {
    std::lock_guard<std::mutex> lock(_mutex);
    size_t count = 0;
    for (const auto &trim : _trims) {
      count += trim.thread == thread && !trim.idle ? 1 : 0;
    }
    return count;
  }

  bool allIdle() {
    std::lock_guard<std::mutex> lock(_mutex);
    for (const auto &trim : _trims) {
      if (!trim.idle) {
        return false;
      }
    }
    return true;
  }

private:
  struct Trim {
    std::thread::id thread;
    bool idle;
    Clock::time_point at;
  };
  std::mutex _mutex;
  std::vector<Trim> _trims;
};

// Stands in for a Graphite surface, a GPU one with a recorder, and tells which
// thread destroyed it.
class FakeSurface {
public:
  explicit FakeSurface(
      bool onGpu,
      std::shared_ptr<std::promise<std::thread::id>> destroyedOn = nullptr)
      : _onGpu(onGpu), _destroyedOn(std::move(destroyedOn)) {}

  ~FakeSurface() {
    if (_destroyedOn != nullptr) {
      _destroyedOn->set_value(std::this_thread::get_id());
    }
  }

  const void *recorder() const { return _onGpu ? this : nullptr; }

private:
  bool _onGpu;
  std::shared_ptr<std::promise<std::thread::id>> _destroyedOn;
};

// A loop thread that, once it starts drawing, runs GPU work every couple of
// milliseconds until it stops, as a thread that draws every frame does.
class DrawingThread {
public:
  explicit DrawingThread(RNSkThreadTrims *trims) : _trims(trims) {}

  ~DrawingThread() { stopDrawing(); }

  std::thread::id id() const { return _loop.id(); }

  void runAndWait(const std::function<void()> &operation) {
    _loop.runAndWait(operation);
  }

  Dispatcher::Scheduler scheduler() { return _loop.scheduler(); }

  void startDrawing() {
    _loop.post([this]() { drawFrame(); });
  }

  void stopDrawing() { _drawing = false; }

private:
  void drawFrame() {
    if (!_drawing) {
      return;
    }
    _trims->ranWorkOnCurrentThread();
    std::this_thread::sleep_for(2ms);
    _loop.post([this]() { drawFrame(); });
  }

  RNSkThreadTrims *_trims;
  std::atomic<bool> _drawing{true};
  // Last, so that it ends, running the frame it was posted last, while what
  // that frame reads is still there.
  Loop _loop;
};

bool eventually(const std::function<bool()> &condition) {
  const auto deadline = Clock::now() + 5s;
  while (!condition()) {
    if (Clock::now() > deadline) {
      return false;
    }
    std::this_thread::sleep_for(5ms);
  }
  return true;
}

// The trims run on the threads themselves, through their dispatchers.
int checkTrims() {
  const auto delay = 30ms;
  // A trim may be due longer than this after the delay only on a loaded
  // machine, where a check that nothing ran gets weaker, never wrong.
  const auto settle = delay * 10;
  // Never destroyed, as the instance the library uses: its thread is detached.
  auto *trims = new RNSkThreadTrims(delay);
  auto *log = new TrimLog();
  trims->setIdleTask([log](bool idle) { log->add(idle); });

  // A thread bound to its loop trims on that loop, once for all the requests
  // made before its trim came due, idle once it ran no GPU work for the delay.
  Loop jsThread;
  std::shared_ptr<Dispatcher> jsDispatcher;
  jsThread.runAndWait([&]() {
    Dispatcher::bindCurrentThread(jsThread.scheduler());
    jsDispatcher = Dispatcher::getDispatcher();
    trims->ranWorkOnCurrentThread();
    trims->ranWorkOnCurrentThread();
  });
  trims->request(jsDispatcher);
  if (!eventually([&]() { return log->countOn(jsThread.id()) == 1; })) {
    return fail("a bound thread does not trim on itself after a request");
  }
  std::this_thread::sleep_for(settle);
  if (log->count() != 1) {
    return fail("requests made before the trim came due trim more than once");
  }
  if (!log->allIdle()) {
    return fail("a thread that ran no GPU work for the delay trims busy");
  }

  // A request from another thread, the collector's for one, trims the thread
  // of the dispatcher, never the requester.
  std::thread([&]() { trims->request(jsDispatcher); }).join();
  if (!eventually([&]() { return log->countOn(jsThread.id()) == 2; }) ||
      log->count() != 2) {
    return fail("a request from another thread does not trim the thread of "
                "the dispatcher");
  }

  // A thread no loop reaches keeps one trim in its queue, however many
  // requests come, until it runs its queue. Run idle, that trim serves the
  // requests made while it was queued; run busy, it leaves them one more.
  Loop workletThread;
  std::shared_ptr<Dispatcher> workletDispatcher;
  workletThread.runAndWait([&]() {
    workletDispatcher = Dispatcher::getDispatcher();
    trims->ranWorkOnCurrentThread();
  });
  std::this_thread::sleep_for(settle);
  for (int request = 0; request < 5; request++) {
    trims->request(workletDispatcher);
    std::this_thread::sleep_for(delay * 2);
  }
  std::this_thread::sleep_for(settle);
  const auto runQueue = []() { Dispatcher::getDispatcher()->processQueue(); };
  if (log->countOn(workletThread.id()) != 0) {
    return fail("an unbound thread trims before it runs its queue");
  }
  const auto ranOnWorklet = [&](size_t count) {
    return eventually([&]() {
      workletThread.runAndWait(runQueue);
      return log->countOn(workletThread.id()) >= count;
    });
  };
  if (!ranOnWorklet(1) || log->countOn(workletThread.id()) != 1) {
    return fail("an unbound thread does not keep exactly one trim in its "
                "queue");
  }
  std::this_thread::sleep_for(settle);
  workletThread.runAndWait(runQueue);
  if (log->countOn(workletThread.id()) != 1) {
    return fail("an idle trim leaves the requests made while it was queued a "
                "trim");
  }
  trims->request(workletDispatcher);
  std::this_thread::sleep_for(settle);
  workletThread.runAndWait([&]() {
    trims->ranWorkOnCurrentThread();
    trims->request(workletDispatcher);
    runQueue();
  });
  if (log->countOn(workletThread.id()) != 2 ||
      log->busyCountOn(workletThread.id()) != 1) {
    return fail("an unbound thread that ran GPU work since its trim was "
                "queued does not run it busy");
  }
  if (!ranOnWorklet(3) || log->countOn(workletThread.id()) != 3) {
    return fail("the requests made while a busy trim was queued get no trim");
  }
  std::this_thread::sleep_for(settle);
  workletThread.runAndWait(runQueue);
  if (log->countOn(workletThread.id()) != 3) {
    return fail("a thread trims with no request left");
  }

  // Every thread asked so far trims once more when anything may have gone.
  trims->requestAll();
  if (!eventually([&]() { return log->countOn(jsThread.id()) == 3; })) {
    return fail("requestAll does not trim a thread asked before");
  }

  // A thread that keeps running GPU work trims, busy, the delay after a
  // request, between two of its tasks.
  DrawingThread drawingThread(trims);
  std::shared_ptr<Dispatcher> drawingDispatcher;
  drawingThread.runAndWait([&]() {
    Dispatcher::bindCurrentThread(drawingThread.scheduler());
    drawingDispatcher = Dispatcher::getDispatcher();
  });
  drawingThread.startDrawing();
  trims->request(drawingDispatcher);
  const bool trimmedWhileDrawing =
      eventually([&]() { return log->busyCountOn(drawingThread.id()) == 1; });
  drawingThread.stopDrawing();
  if (!trimmedWhileDrawing) {
    return fail("a thread that keeps running GPU work never trims");
  }

  // What a thread made that another holder still holds (a shader holding an
  // image) is kept by that thread, which trims again until the holder lets
  // go, then lets go of it on itself at its next trim, which, idle, frees what
  // came back, and trims no more for it. It keeps one holding
  // of what two let go of: a second one's reference would keep the first from
  // ever being the last.
  Loop heldThread;
  std::shared_ptr<Dispatcher> heldDispatcher;
  heldThread.runAndWait([&]() {
    Dispatcher::bindCurrentThread(heldThread.scheduler());
    heldDispatcher = Dispatcher::getDispatcher();
  });
  auto firstWrapper = std::make_shared<int>(0);
  auto secondWrapper = firstWrapper;
  auto shader = firstWrapper;
  const void *held = firstWrapper.get();
  std::promise<std::thread::id> letGoOn;
  auto letGo = letGoOn.get_future();
  std::atomic<std::size_t> trimsBeforeLettingGo{0};
  const auto holdingOf = [&letGoOn, &trimsBeforeLettingGo, log,
                          &heldThread](std::shared_ptr<int> wrapper) {
    auto kept = std::make_shared<std::shared_ptr<int>>(std::move(wrapper));
    return [kept, &letGoOn, &trimsBeforeLettingGo, log, &heldThread]() {
      if (kept->use_count() > 1) {
        return false;
      }
      kept->reset();
      trimsBeforeLettingGo = log->countOn(heldThread.id());
      letGoOn.set_value(std::this_thread::get_id());
      return true;
    };
  };
  trims->hold(heldDispatcher, held, holdingOf(std::move(firstWrapper)));
  trims->hold(heldDispatcher, held, holdingOf(std::move(secondWrapper)));
  if (!eventually([&]() { return log->countOn(heldThread.id()) >= 3; })) {
    return fail("a thread that keeps what another holder holds does not trim "
                "again");
  }
  shader.reset();
  if (letGo.wait_for(5s) != std::future_status::ready ||
      letGo.get() != heldThread.id()) {
    return fail("a thread does not let go of what it keeps, on itself, once "
                "it is the last holder");
  }
  std::this_thread::sleep_for(
      delay * (1 << RNSkThreadTrimSchedule::kMaxFollowUpDoublings) + settle);
  if (log->countOn(heldThread.id()) != trimsBeforeLettingGo + 1) {
    return fail("a thread that let go at an idle trim of what it kept, and "
                "keeps nothing more, trims again");
  }

  // What a holding lets go of at a trim comes back to the thread's recorders
  // at that trim, too recently for a busy one to free it: a thread that keeps
  // running GPU work trims once more, the delay after.
  DrawingThread busyHeldThread(trims);
  std::shared_ptr<Dispatcher> busyHeldDispatcher;
  busyHeldThread.runAndWait([&]() {
    Dispatcher::bindCurrentThread(busyHeldThread.scheduler());
    busyHeldDispatcher = Dispatcher::getDispatcher();
  });
  busyHeldThread.startDrawing();
  auto busyImage = std::make_shared<int>(0);
  auto busyShader = busyImage;
  std::promise<std::thread::id> busyLetGoOn;
  auto busyLetGo = busyLetGoOn.get_future();
  std::atomic<std::size_t> trimsBeforeBusyLetGo{0};
  const void *busyHeld = busyImage.get();
  trims->hold(
      busyHeldDispatcher, busyHeld,
      [kept = std::make_shared<std::shared_ptr<int>>(std::move(busyImage)),
       &busyLetGoOn, &trimsBeforeBusyLetGo, log, &busyHeldThread]() {
        if (kept->use_count() > 1) {
          return false;
        }
        kept->reset();
        trimsBeforeBusyLetGo = log->countOn(busyHeldThread.id());
        busyLetGoOn.set_value(std::this_thread::get_id());
        return true;
      });
  busyShader.reset();
  const bool busyLetGoInTime =
      busyLetGo.wait_for(5s) == std::future_status::ready;
  const bool trimmedAfter = eventually([&]() {
    return log->countOn(busyHeldThread.id()) >= trimsBeforeBusyLetGo + 2;
  });
  busyHeldThread.stopDrawing();
  if (!busyLetGoInTime || !trimmedAfter) {
    return fail("a thread that keeps running GPU work does not trim again "
                "after a holding let go");
  }

  // A hold of an image during the trim that runs the thread's holdings is
  // the same holding: two would each keep the other from being the last.
  Loop windowThread;
  std::shared_ptr<Dispatcher> windowDispatcher;
  windowThread.runAndWait([&]() {
    Dispatcher::bindCurrentThread(windowThread.scheduler());
    windowDispatcher = Dispatcher::getDispatcher();
  });
  auto windowDestroyedOn = std::make_shared<std::promise<std::thread::id>>();
  auto windowDestroyed = windowDestroyedOn->get_future();
  auto windowFirst =
      std::shared_ptr<int>(new int(0), [windowDestroyedOn](int *image) {
        windowDestroyedOn->set_value(std::this_thread::get_id());
        delete image;
      });
  auto windowSecond = windowFirst;
  auto windowShader = windowFirst;
  const void *windowHeld = windowFirst.get();
  std::atomic<bool> heldAgain{false};
  trims->hold(
      windowDispatcher, windowHeld,
      [kept = std::make_shared<std::shared_ptr<int>>(std::move(windowFirst)),
       &windowSecond, &heldAgain, trims, windowDispatcher, windowHeld]() {
        if (!heldAgain.exchange(true)) {
          trims->hold(windowDispatcher, windowHeld,
                      [second = std::make_shared<std::shared_ptr<int>>(
                           std::move(windowSecond))]() {
                        if (second->use_count() > 1) {
                          return false;
                        }
                        second->reset();
                        return true;
                      });
        }
        if (kept->use_count() > 1) {
          return false;
        }
        kept->reset();
        return true;
      });
  if (!eventually([&]() { return heldAgain.load(); })) {
    return fail("the trim that runs a thread's holdings does not run");
  }
  windowShader.reset();
  if (windowDestroyed.wait_for(5s) != std::future_status::ready ||
      windowDestroyed.get() != windowThread.id()) {
    return fail("a hold made while the thread's holdings run keeps a second "
                "holding of the same image");
  }

  // A trim may let go of an image, and the heap give its address to another,
  // before the trim is done with the thread's holdings: a hold of that
  // address meanwhile is the other image's own holding.
  Loop reuseThread;
  std::shared_ptr<Dispatcher> reuseDispatcher;
  reuseThread.runAndWait([&]() {
    Dispatcher::bindCurrentThread(reuseThread.scheduler());
    reuseDispatcher = Dispatcher::getDispatcher();
  });
  int reusedAddress = 0;
  const void *reused = &reusedAddress;
  auto reuseDestroyedOn = std::make_shared<std::promise<std::thread::id>>();
  auto reuseDestroyed = reuseDestroyedOn->get_future();
  auto reuseImage =
      std::shared_ptr<int>(new int(0), [reuseDestroyedOn](int *image) {
        reuseDestroyedOn->set_value(std::this_thread::get_id());
        delete image;
      });
  auto reuseShader = reuseImage;
  std::atomic<bool> letGoOfFirst{false};
  trims->hold(reuseDispatcher, reused,
              [&letGoOfFirst, trims, reuseDispatcher, reused,
               image = std::move(reuseImage)]() mutable {
                trims->hold(reuseDispatcher, reused,
                            [kept = std::make_shared<std::shared_ptr<int>>(
                                 std::move(image))]() {
                              if (kept->use_count() > 1) {
                                return false;
                              }
                              kept->reset();
                              return true;
                            });
                letGoOfFirst = true;
                return true;
              });
  if (!eventually([&]() { return letGoOfFirst.load(); })) {
    return fail("the trim that runs a thread's holdings does not run");
  }
  reuseShader.reset();
  if (reuseDestroyed.wait_for(5s) != std::future_status::ready ||
      reuseDestroyed.get() != reuseThread.id()) {
    return fail("a hold of an address its thread's trim let go of meanwhile "
                "is lost");
  }

  // A thread that keeps holding images polls its holdings the delay after the
  // first: a hold is not put off by the next one.
  Loop streamThread;
  std::shared_ptr<Dispatcher> streamDispatcher;
  streamThread.runAndWait([&]() {
    Dispatcher::bindCurrentThread(streamThread.scheduler());
    streamDispatcher = Dispatcher::getDispatcher();
  });
  auto streamLetGo = std::make_shared<std::atomic<int>>(0);
  const auto streamStart = Clock::now();
  while (streamLetGo->load() == 0 && Clock::now() - streamStart < 5s) {
    auto image = std::make_shared<int>(0);
    const void *streamHeld = image.get();
    trims->hold(
        streamDispatcher, streamHeld,
        [kept = std::make_shared<std::shared_ptr<int>>(image), streamLetGo]() {
          if (kept->use_count() > 1) {
            return false;
          }
          kept->reset();
          streamLetGo->fetch_add(1);
          return true;
        });
    image.reset();
    std::this_thread::sleep_for(5ms);
  }
  if (streamLetGo->load() == 0) {
    return fail("a thread that keeps holding images never lets go of one "
                "while it does");
  }
  std::this_thread::sleep_for(settle);

  // A surface let go of anywhere goes on the thread that made it, which then
  // trims when the surface was on the GPU, and only then.
  Loop surfaceThread;
  std::shared_ptr<Dispatcher> surfaceDispatcher;
  surfaceThread.runAndWait([&]() {
    Dispatcher::bindCurrentThread(surfaceThread.scheduler());
    surfaceDispatcher = Dispatcher::getDispatcher();
  });
  trims->releaseSurface(surfaceDispatcher,
                        std::make_shared<FakeSurface>(/* onGpu= */ false));
  std::this_thread::sleep_for(settle);
  if (log->countOn(surfaceThread.id()) != 0) {
    return fail("a raster surface let go of asks for a trim");
  }
  auto destroyedOn = std::make_shared<std::promise<std::thread::id>>();
  auto destroyed = destroyedOn->get_future();
  trims->releaseSurface(surfaceDispatcher, std::make_shared<FakeSurface>(
                                               /* onGpu= */ true, destroyedOn));
  if (destroyed.wait_for(5s) != std::future_status::ready ||
      destroyed.get() != surfaceThread.id()) {
    return fail("a surface let go of on another thread is not destroyed on "
                "the thread that made it");
  }
  if (!eventually([&]() { return log->countOn(surfaceThread.id()) == 1; })) {
    return fail("a GPU surface let go of does not have its thread trim");
  }
  surfaceThread.runAndWait([&]() {
    trims->releaseSurface(surfaceDispatcher,
                          std::make_shared<FakeSurface>(/* onGpu= */ true));
  });
  if (!eventually([&]() { return log->countOn(surfaceThread.id()) == 2; })) {
    return fail("a GPU surface let go of on its own thread does not have that "
                "thread trim");
  }

  // A thread no loop reaches lets go of a surface when it runs its queue,
  // right before a trim due by then, too soon for a busy trim to free what
  // came back: it trims half the delay after the surface went or later, also
  // while it keeps running GPU work.
  DrawingThread busyWorkletThread(trims);
  std::shared_ptr<Dispatcher> busyWorkletDispatcher;
  busyWorkletThread.runAndWait(
      [&]() { busyWorkletDispatcher = Dispatcher::getDispatcher(); });
  busyWorkletThread.startDrawing();
  auto surfaceWentAt = std::make_shared<std::promise<Clock::time_point>>();
  const auto surfaceWent = surfaceWentAt->get_future().share();
  trims->releaseSurface(
      busyWorkletDispatcher,
      std::shared_ptr<FakeSurface>(new FakeSurface(/* onGpu= */ true),
                                   [surfaceWentAt](FakeSurface *surface) {
                                     delete surface;
                                     surfaceWentAt->set_value(Clock::now());
                                   }));
  std::this_thread::sleep_for(settle);
  const bool trimmedAfterSurfaceWent = eventually([&]() {
    busyWorkletThread.runAndWait(runQueue);
    return surfaceWent.wait_for(0s) == std::future_status::ready &&
           log->countOnSince(busyWorkletThread.id(),
                             surfaceWent.get() + delay / 2) > 0;
  });
  busyWorkletThread.stopDrawing();
  if (!trimmedAfterSurfaceWent) {
    return fail("a thread no loop reaches, which keeps running GPU work, does "
                "not trim after a surface it let go of in its queue went");
  }

  // A thread that ended takes its trim with it, and its dispatcher is not
  // kept alive for it.
  std::weak_ptr<Dispatcher> endedDispatcher;
  std::thread::id endedThread;
  std::thread([&]() {
    endedDispatcher = Dispatcher::getDispatcher();
    endedThread = std::this_thread::get_id();
    trims->ranWorkOnCurrentThread();
  }).join();
  std::this_thread::sleep_for(settle);
  trims->requestAll();
  std::this_thread::sleep_for(settle);
  if (!endedDispatcher.expired()) {
    return fail("the dispatcher of a thread that ended is kept alive");
  }
  if (log->countOn(endedThread) != 0) {
    return fail("a thread that ended trims");
  }

  // The render threads are trimmed by the pool: their GPU work asks nothing,
  // so the thread's queue holds no trim once the delay passed.
  std::promise<std::thread::id> renderThread;
  RNSkThreadPool::getInstance().post([&]() {
    trims->ranWorkOnCurrentThread();
    std::this_thread::sleep_for(settle);
    Dispatcher::getDispatcher()->processQueue();
    renderThread.set_value(std::this_thread::get_id());
  });
  if (log->countOn(renderThread.get_future().get()) != 0) {
    return fail("GPU work on a render thread asks for a trim outside the pool");
  }

  // A thread whose post to its loop failed, as one Java threw for, trims once
  // its post is made again.
  Loop failingThread;
  std::shared_ptr<Dispatcher> failingDispatcher;
  auto posts = std::make_shared<std::atomic<int>>(0);
  failingThread.runAndWait([&]() {
    Dispatcher::bindCurrentThread(
        [scheduler = failingThread.scheduler(),
         posts](Dispatcher::Operation operation) {
          return posts->fetch_add(1) != 0 && scheduler(std::move(operation));
        });
    failingDispatcher = Dispatcher::getDispatcher();
  });
  trims->request(failingDispatcher);
  if (!eventually([&]() { return log->countOn(failingThread.id()) == 1; })) {
    return fail("a thread whose post to its loop failed never trims");
  }
  return 0;
}

} // namespace

#if defined(__linux__)
// The threads the process runs, its own task folders.
std::ptrdiff_t threadCount() {
  const std::filesystem::directory_iterator tasks("/proc/self/task");
  return std::distance(std::filesystem::begin(tasks),
                       std::filesystem::end(tasks));
}
#endif

// What a thread asked to trim has nothing to trim for: no thread of its own.
int checkNothingToTrim() {
#if defined(__linux__)
  const auto before = threadCount();
  auto *trims = new RNSkThreadTrims(30ms);
  trims->requestAll();
  std::this_thread::sleep_for(300ms);
  if (threadCount() != before) {
    return fail("requestAll with no thread to trim starts a thread");
  }
#endif
  return 0;
}

#if defined(__linux__)
// RLIMIT_NPROC binds no process whose real user is root or that has
// CAP_SYS_RESOURCE or CAP_SYS_ADMIN (Linux copy_process).
bool dropThreadLimitExemptions() {
  if (getuid() == 0 && setuid(65534) != 0) {
    return false;
  }
  __user_cap_header_struct header{_LINUX_CAPABILITY_VERSION_3, 0};
  __user_cap_data_struct noCapabilities[_LINUX_CAPABILITY_U32S_3] = {};
  return syscall(SYS_capset, &header, noCapabilities) == 0;
}

int checkTrimsThreadThatCannotStartWhereTheLimitBinds() {
  auto *trims = new RNSkThreadTrims(30ms);
  auto *log = new TrimLog();
  trims->setIdleTask([log](bool idle) { log->add(idle); });
  Loop jsThread;
  std::shared_ptr<Dispatcher> jsDispatcher;
  jsThread.runAndWait([&]() {
    Dispatcher::bindCurrentThread(jsThread.scheduler());
    jsDispatcher = Dispatcher::getDispatcher();
  });
  rlimit threads{};
  getrlimit(RLIMIT_NPROC, &threads);
  const rlimit saved = threads;
  threads.rlim_cur = 1;
  setrlimit(RLIMIT_NPROC, &threads);
  const auto before = threadCount();
  bool threw = false;
  try {
    trims->request(jsDispatcher);
  } catch (...) {
    threw = true;
  }
  const bool started = threadCount() != before;
  setrlimit(RLIMIT_NPROC, &saved);
  if (started) {
    return fail("a thread starts past RLIMIT_NPROC");
  }
  if (threw) {
    return fail("a request throws when the trims thread cannot start");
  }
  trims->request(jsDispatcher);
  if (!eventually([&]() { return log->countOn(jsThread.id()) == 1; })) {
    return fail("the trims thread does not start once it can");
  }
  return 0;
}
#endif

// Noting GPU work or a release never throws into the submit or the
// destructor it is called from, even when the trims thread cannot start: it
// starts once it can. The case runs in a child process the thread limit binds.
int checkTrimsThreadThatCannotStart() {
#if defined(__linux__)
  std::fflush(nullptr);
  const pid_t child = fork();
  if (child < 0) {
    return fail("the cannot-start case cannot fork");
  }
  if (child == 0) {
    const int failed = dropThreadLimitExemptions()
                           ? checkTrimsThreadThatCannotStartWhereTheLimitBinds()
                           : fail("the cannot-start case cannot drop root");
    std::fflush(nullptr);
    _exit(failed);
  }
  int status = 0;
  if (waitpid(child, &status, 0) != child || !WIFEXITED(status)) {
    return fail("the cannot-start case does not exit");
  }
  return WEXITSTATUS(status);
#else
  return 0;
#endif
}

int main() {
  if (int failed = checkTrimsThreadThatCannotStart()) {
    return failed;
  }
  if (int failed = checkNothingToTrim()) {
    return failed;
  }
  if (int failed = checkSchedule()) {
    return failed;
  }
  if (int failed = checkTrims()) {
    return failed;
  }
  std::printf("ThreadTrimsTest: passed\n");
  return 0;
}
