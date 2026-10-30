#pragma once

#include <algorithm>
#include <chrono>
#include <initializer_list>
#include <optional>
#include <unordered_map>
#include <vector>

namespace RNSkia {

/**
 * When each thread outside the render pool trims its recorders, and whether
 * it trims idle (see RNSkThreadTrims). Something a thread made going away
 * (request) has it trim the delay after the latest such request, whatever it
 * runs meanwhile, as a render thread does; GPU work (ranWork) has it trim the
 * delay after the latest of it, so once it stopped; keeping something another
 * holder holds (held) has it trim the delay after the first of it, and again
 * after each trim after which it still keeps it (trimmed), since that holder
 * (a shader, a picture) lets go without asking; what a busy trim lets go of
 * is a request. Requests add up: one trim serves every request due by the
 * time it is taken, and an idle one every request made before it ran; a
 * request not due yet, or made after the take before a busy trim ran, gets a
 * trim of its own. A trim whose post to its thread failed stays taken, and
 * its post is made again the delay after (postFailed). A thread trims idle
 * when it ran no GPU work for the delay; a trim it runs busy leaves its work
 * to the trim after it, idle. The times are the caller's, so that the
 * schedule decides the same way for the same times.
 */
class RNSkThreadTrimSchedule {
public:
  using Clock = std::chrono::steady_clock;
  /** A thread, by an address that stays its own while it lives. */
  using Thread = const void *;

  /**
   How many times the wait for a thread's next trim doubles while it still
   keeps something another holder holds after each trim.
   */
  static constexpr int kMaxFollowUpDoublings = 5;

  explicit RNSkThreadTrimSchedule(Clock::duration delay) : _delay(delay) {}

  /** How long after the latest request for it a thread trims. */
  Clock::duration delay() const { return _delay; }

  /** Something `thread` made went away at `now`. */
  void request(Thread thread, Clock::time_point now) {
    _threads[thread].requestDue = now + _delay;
  }

  /**
   `thread` keeps, from `now`, something another holder still holds: it
   trims the delay after, however many it keeps after it, and the wait for
   the trims after starts over.
   */
  void held(Thread thread, Clock::time_point now) {
    auto &state = _threads[thread];
    if (!state.followUpDue.has_value() || *state.followUpDue > now + _delay) {
      state.followUpDue = now + _delay;
    }
    state.followUpDoublings = 0;
  }

  /** `thread` ran GPU work at `now`. */
  void ranWork(Thread thread, Clock::time_point now) {
    auto &state = _threads[thread];
    state.workDue = now + _delay;
    state.lastWork = now;
  }

  /** The earliest time a thread whose trim is not taken yet is due. */
  std::optional<Clock::time_point> nextDue() const {
    std::optional<Clock::time_point> earliest;
    for (const auto &[thread, state] : _threads) {
      const auto due = state.taken ? state.repostDue : state.due();
      if (due.has_value() && (!earliest.has_value() || *due < *earliest)) {
        earliest = due;
      }
    }
    return earliest;
  }

  /**
   The threads due at `now`, whose trims are taken: none of them is due
   again before it ran its trim (see ran).
   */
  std::vector<Thread> takeDue(Clock::time_point now) {
    std::vector<Thread> taken;
    for (auto &[thread, state] : _threads) {
      const auto due = state.due();
      if (due.has_value() && !state.taken && *due <= now) {
        // A request not due yet keeps its own trim: what it is about may have
        // come back too recently for a busy one. GPU work is served by an idle
        // trim alone (see ran). A follow-up is for the thread's holdings, which
        // every trim runs (see trimmed).
        if (state.requestDue.has_value() && *state.requestDue <= now) {
          state.requestDue.reset();
        }
        state.followUpDue.reset();
        state.taken = true;
        taken.push_back(thread);
      }
    }
    return taken;
  }

  /**
   `thread` runs the trim taken for it, at `now`: whether it trims idle. An
   idle trim frees all it can, so it serves every request and GPU work made
   before it. A thread the schedule forgot meanwhile trims idle.
   */
  bool ran(Thread thread, Clock::time_point now) {
    auto it = _threads.find(thread);
    if (it == _threads.end()) {
      return true;
    }
    auto &state = it->second;
    state.taken = false;
    state.repostDue.reset();
    const bool idle =
        !state.lastWork.has_value() || now - *state.lastWork >= _delay;
    if (idle) {
      state.requestDue.reset();
      state.workDue.reset();
    }
    return idle;
  }

  /**
   `thread` ran its trim at `now`. When a busy trim let go there of something
   another holder held (`letGo`), what came back to its recorders did during
   that trim, too recently for it to free: that is a request, and the wait
   for the trims after starts over. When the thread still keeps something
   (`stillHolds`), it trims again the delay after this trim, then twice as
   long after each trim after which it still does, up to
   kMaxFollowUpDoublings times; otherwise no trim follows for what it kept.
   */
  void trimmed(Thread thread, Clock::time_point now, bool letGo,
               bool stillHolds) {
    auto it = _threads.find(thread);
    if (it == _threads.end()) {
      return;
    }
    auto &state = it->second;
    if (letGo) {
      request(thread, now);
      state.followUpDoublings = 0;
    }
    if (!stillHolds) {
      state.followUpDue.reset();
      state.followUpDoublings = 0;
      return;
    }
    state.followUpDue = now + _delay * (1 << state.followUpDoublings);
    state.followUpDoublings =
        std::min(state.followUpDoublings + 1, kMaxFollowUpDoublings);
  }

  /**
   The post of the trim taken for `thread` failed at `now`: the trim stays
   taken, in the thread's queue, and its post is made again the delay after.
   */
  void postFailed(Thread thread, Clock::time_point now) {
    auto it = _threads.find(thread);
    if (it != _threads.end() && it->second.taken) {
      it->second.repostDue = now + _delay;
    }
  }

  /** The threads whose trim's post is to be made again by `now`, once each. */
  std::vector<Thread> takeReposts(Clock::time_point now) {
    std::vector<Thread> reposts;
    for (auto &[thread, state] : _threads) {
      if (state.repostDue.has_value() && *state.repostDue <= now) {
        state.repostDue.reset();
        reposts.push_back(thread);
      }
    }
    return reposts;
  }

  /** `thread` ended: what the schedule kept for it goes. */
  void forget(Thread thread) { _threads.erase(thread); }

private:
  struct State {
    // When the latest request no trim served yet is due.
    std::optional<Clock::time_point> requestDue;
    // The delay after the latest GPU work no idle trim served yet.
    std::optional<Clock::time_point> workDue;
    // When the thread next polls what it keeps: the delay after a hold, then
    // at the doubling wait after each trim it still kept something after.
    std::optional<Clock::time_point> followUpDue;
    int followUpDoublings = 0;
    std::optional<Clock::time_point> lastWork;
    // The trim is handed to the thread and has not run yet.
    bool taken = false;
    // When the post of that trim is made again, once one failed.
    std::optional<Clock::time_point> repostDue;

    std::optional<Clock::time_point> due() const {
      std::optional<Clock::time_point> earliest;
      for (const auto &candidate : {requestDue, workDue, followUpDue}) {
        if (candidate.has_value() &&
            (!earliest.has_value() || *candidate < *earliest)) {
          earliest = candidate;
        }
      }
      return earliest;
    }
  };

  const Clock::duration _delay;
  std::unordered_map<Thread, State> _threads;
};

} // namespace RNSkia
