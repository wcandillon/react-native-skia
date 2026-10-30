#pragma once

#include <algorithm>
#include <condition_variable>
#include <functional>
#include <memory>
#include <mutex>
#include <system_error>
#include <thread>
#include <unordered_map>
#include <utility>
#include <vector>

#include "RNSkThreadPool.h"
#include "RNSkThreadPriority.h"
#include "RNSkThreadTrimSchedule.h"
#include "api/JsiSkDispatcher.h"

namespace RNSkia {

/**
 * Trims the recorders of the threads outside the render pool that run GPU
 * work — the JS thread, the main thread, the threads of worklet runtimes and
 * the Android present thread — as the render threads trim theirs (see
 * RNSkGraphiteProducer). A recorder belongs to its thread (see
 * DawnContext::trimThreadRecorders), and these threads are not the
 * library's, so each trims on itself, through its Dispatcher, when its trim
 * comes due (see RNSkThreadTrimSchedule): a thread bound to its loop trims
 * then, any other thread the next time it runs its queue; a post that failed
 * is made again the delay after. A thread of its own waits for the next trim
 * due, and sleeps while none is.
 */
class RNSkThreadTrims {
public:
  using Clock = RNSkThreadTrimSchedule::Clock;
  /**
   What a thread runs on itself when its trim comes due; `idle`: it ran no
   GPU work for the delay.
   */
  using IdleTask = std::function<void(bool idle)>;
  /**
   Lets go of what a thread keeps of something it made that another holder
   still holds (a texture image a shader or a picture holds, see hold), once
   it holds the last reference, and returns whether it did. Run on that
   thread at its trims, before the trim.
   */
  using LetGoIfLast = std::function<bool()>;

  static RNSkThreadTrims &getInstance() {
    // Never destroyed: its thread is detached, as the render threads are.
    static auto *instance = new RNSkThreadTrims(RNSkThreadPool::kIdleDelay);
    return *instance;
  }

  explicit RNSkThreadTrims(Clock::duration delay) : _schedule(delay) {}

  RNSkThreadTrims(const RNSkThreadTrims &) = delete;
  RNSkThreadTrims &operator=(const RNSkThreadTrims &) = delete;

  /** The task every thread runs on itself when its trim comes due. */
  void setIdleTask(IdleTask task) {
    std::lock_guard<std::mutex> lock(_mutex);
    _idleTask = std::move(task);
  }

  /**
   The calling thread ran GPU work on its recorders. Nothing on a render
   thread, which the pool trims.
   */
  void ranWorkOnCurrentThread() {
    if (RNSkThreadPool::isPoolThread()) {
      return;
    }
    auto dispatcher = Dispatcher::getDispatcher();
    std::lock_guard<std::mutex> lock(_mutex);
    rememberLocked(dispatcher);
    const auto now = Clock::now();
    _schedule.ranWork(dispatcher.get(), now);
    wakeForLocked(now + _schedule.delay());
  }

  /**
   Lets go of `surface` on the thread of `dispatcher`, the thread that made
   it (see Dispatcher::release): a GPU surface's texture comes back to that
   thread's recorder, and the thread trims the delay after it does. A thread
   no loop reaches lets go of it when it next runs its queue, right before a
   trim due by then, too soon for a busy one to free it: the request comes
   from there. Any thread.
   */
  template <typename Surface>
  void releaseSurface(const std::shared_ptr<Dispatcher> &dispatcher,
                      Surface surface) {
    if (surface == nullptr || surface->recorder() == nullptr) {
      dispatcher->release(std::move(surface));
      return;
    }
    if (dispatcher->isCurrentThread()) {
      surface = nullptr;
      request(dispatcher);
      return;
    }
    dispatcher->run([this, surface = std::move(surface)]() mutable {
      surface = nullptr;
      request(Dispatcher::getDispatcher());
    });
  }

  /**
   What the thread of `dispatcher` made went away: called once it is gone,
   since an idle trim serves every request made before it ran. Any thread.
   */
  void request(const std::shared_ptr<Dispatcher> &dispatcher) {
    if (dispatcher == nullptr) {
      return;
    }
    std::lock_guard<std::mutex> lock(_mutex);
    rememberLocked(dispatcher);
    const auto now = Clock::now();
    _schedule.request(dispatcher.get(), now);
    wakeForLocked(now + _schedule.delay());
  }

  /**
   What the thread of `dispatcher` made went away, but for `held`, which
   another holder still holds and `letGoIfLast` keeps: the thread trims the
   delay after however many it keeps after it, and again at a doubling wait
   (see RNSkThreadTrimSchedule::trimmed) for as long as it keeps one. The
   thread keeps one holding of `held`: the reference of a second would keep
   the first from ever being the last. While the thread's trim runs its
   holding of `held`, this one takes its place, since that one may let go
   meanwhile and the heap give its address to another image. Any thread.
   */
  void hold(const std::shared_ptr<Dispatcher> &dispatcher, const void *held,
            LetGoIfLast letGoIfLast) {
    if (dispatcher == nullptr) {
      return;
    }
    std::lock_guard<std::mutex> lock(_mutex);
    rememberLocked(dispatcher);
    auto &holdings = _holdings[dispatcher.get()];
    auto kept = std::find_if(
        holdings.begin(), holdings.end(),
        [held](const Holding &holding) { return holding.held == held; });
    if (kept == holdings.end()) {
      holdings.push_back({held, std::move(letGoIfLast)});
    } else if (!kept->letGoIfLast) {
      kept->letGoIfLast = std::move(letGoIfLast);
    }
    const auto now = Clock::now();
    _schedule.held(dispatcher.get(), now);
    wakeForLocked(now + _schedule.delay());
  }

  /**
   What any thread may have made went away: every thread that ran GPU work
   trims. Any thread.
   */
  void requestAll() {
    std::lock_guard<std::mutex> lock(_mutex);
    forgetEndedThreadsLocked();
    if (_threads.empty()) {
      return;
    }
    const auto now = Clock::now();
    for (const auto &thread : _threads) {
      _schedule.request(thread.first, now);
    }
    wakeForLocked(now + _schedule.delay());
  }

private:
  using Thread = RNSkThreadTrimSchedule::Thread;

  // What a thread keeps of `held`; `letGoIfLast` is empty while the thread's
  // trim runs it, unless a hold of `held` meanwhile took its place.
  struct Holding {
    const void *held;
    LetGoIfLast letGoIfLast;
  };

  // A thread new to this finds the ones that ended gone first, so that what
  // is kept is for threads alive. A dispatcher's address names one thread:
  // the weak reference kept here holds its storage (make_shared's) until its
  // state goes with it.
  void rememberLocked(const std::shared_ptr<Dispatcher> &dispatcher) {
    if (_threads.try_emplace(dispatcher.get(), dispatcher).second) {
      forgetEndedThreadsLocked();
    }
  }

  void forgetEndedThreadsLocked() {
    for (auto it = _threads.begin(); it != _threads.end();) {
      if (it->second.expired()) {
        _schedule.forget(it->first);
        _holdings.erase(it->first);
        it = _threads.erase(it);
      } else {
        ++it;
      }
    }
  }

  // A trim comes due at `due`: the thread, which wakes by itself at _wakeAt,
  // needs telling only when that is earlier. A thread that cannot start yet
  // (the process at its thread limit) starts at a later wake, and what was
  // asked for meanwhile stays due: the GPU work or the release that asks
  // never fails for it.
  void wakeForLocked(Clock::time_point due) {
    try {
      std::call_once(_started,
                     [this]() { std::thread([this]() { run(); }).detach(); });
    } catch (const std::system_error &) {
      return;
    }
    if (due < _wakeAt) {
      _condition.notify_one();
    }
  }

  void run() {
    configureCurrentThread("RNSkia Trims", RNSkThreadPriority::kBackground);
    std::unique_lock<std::mutex> lock(_mutex);
    for (;;) {
      auto due = _schedule.nextDue();
      if (!due.has_value()) {
        _wakeAt = Clock::time_point::max();
        _condition.wait(lock);
        continue;
      }
      if (Clock::now() < *due) {
        _wakeAt = *due;
        _condition.wait_until(lock, *due);
        continue;
      }
      const auto now = Clock::now();
      auto trims = reachLocked(_schedule.takeDue(now));
      auto reposts = reachLocked(_schedule.takeReposts(now));
      // Posting to a thread's loop calls out of the library (the
      // CallInvoker, the JVM), and the last reference to a dispatcher whose
      // thread just ended may go with `trims`: both outside the lock.
      lock.unlock();
      std::vector<Thread> unposted;
      for (const auto &[thread, dispatcher] : trims) {
        if (!dispatcher->run(
                [this, thread = thread]() { trimOnThread(thread); })) {
          unposted.push_back(thread);
        }
      }
      // The trim taken for each of these is still in its thread's queue: an
      // empty operation has the queue posted again.
      for (const auto &[thread, dispatcher] : reposts) {
        if (!dispatcher->run([]() {})) {
          unposted.push_back(thread);
        }
      }
      trims.clear();
      reposts.clear();
      lock.lock();
      for (auto thread : unposted) {
        _schedule.postFailed(thread, Clock::now());
      }
    }
  }

  // The dispatchers of `threads`; a thread that ended goes, with what was
  // kept for it.
  std::vector<std::pair<Thread, std::shared_ptr<Dispatcher>>>
  reachLocked(const std::vector<Thread> &threads) {
    std::vector<std::pair<Thread, std::shared_ptr<Dispatcher>>> reached;
    for (auto thread : threads) {
      auto it = _threads.find(thread);
      auto dispatcher = it == _threads.end() ? nullptr : it->second.lock();
      if (dispatcher == nullptr) {
        _schedule.forget(thread);
        _holdings.erase(thread);
        if (it != _threads.end()) {
          _threads.erase(it);
        }
        continue;
      }
      reached.emplace_back(thread, std::move(dispatcher));
    }
    return reached;
  }

  void trimOnThread(Thread thread) {
    IdleTask task;
    bool idle = true;
    // The thread's holdings, run outside the lock; their entries stay, so that
    // a hold of the same address meanwhile takes its entry (see hold).
    std::vector<Holding> running;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      idle = _schedule.ran(thread, Clock::now());
      task = _idleTask;
      if (auto it = _holdings.find(thread); it != _holdings.end()) {
        for (auto &kept : it->second) {
          running.push_back(
              {kept.held, std::exchange(kept.letGoIfLast, nullptr)});
        }
      }
    }
    bool letGo = false;
    for (auto &holding : running) {
      if (holding.letGoIfLast()) {
        holding.letGoIfLast = nullptr;
        letGo = true;
      }
    }
    if (task) {
      task(idle);
    }
    std::lock_guard<std::mutex> lock(_mutex);
    bool stillHolds = false;
    if (auto it = _holdings.find(thread); it != _holdings.end()) {
      auto &holdings = it->second;
      for (auto &holding : running) {
        auto entry = std::find_if(holdings.begin(), holdings.end(),
                                  [&holding](const Holding &kept) {
                                    return kept.held == holding.held;
                                  });
        if (entry == holdings.end() || entry->letGoIfLast) {
          continue;
        }
        if (holding.letGoIfLast) {
          entry->letGoIfLast = std::move(holding.letGoIfLast);
        } else {
          holdings.erase(entry);
        }
      }
      stillHolds = !holdings.empty();
      if (!stillHolds) {
        _holdings.erase(it);
      }
    }
    // An idle trim frees what came back during it.
    _schedule.trimmed(thread, Clock::now(), letGo && !idle, stillHolds);
    // A request made while this trim was queued, or the trim after this one,
    // can come due from now on.
    if (auto due = _schedule.nextDue(); due.has_value()) {
      wakeForLocked(*due);
    }
  }

  std::mutex _mutex;
  std::condition_variable _condition;
  std::once_flag _started;
  RNSkThreadTrimSchedule _schedule;
  // The threads asked to trim, by their dispatcher, which this never keeps
  // alive past its thread; the ones that ended go as new ones come.
  std::unordered_map<Thread, std::weak_ptr<Dispatcher>> _threads;
  // What each thread keeps of what it made that other holders still hold.
  std::unordered_map<Thread, std::vector<Holding>> _holdings;
  // When the thread wakes by itself; max while it waits for a request.
  Clock::time_point _wakeAt = Clock::time_point::max();
  IdleTask _idleTask;
};

} // namespace RNSkia
