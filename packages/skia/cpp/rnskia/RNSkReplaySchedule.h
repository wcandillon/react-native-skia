#pragma once

#include <cstddef>
#include <optional>
#include <utility>

namespace RNSkia {

/** When a view's next replay may start (see RNSkReplaySchedule). */
enum class ReplayPacing {
  /** Once the view's previous recording is presented. */
  kAfterPresent,
  /** As soon as the previous replay has finished. */
  kPipelined,
};

/**
 * Where a replay started, against the view's present ticks: what its ticks
 * can tell once it finishes (see RNSkReplaySchedule).
 */
enum class ReplayStart {
  /**
   At a present, before that present's tick: the tick charges the replay its
   own frame, so one finished by its next tick kept up.
   */
  kAtPresent,
  /**
   Between two ticks while the view counts them: one finished before its
   first tick kept up, and one that saw a single tick may have taken less
   than a frame or more.
   */
  kBetweenPresents,
  /**
   While the view counts no ticks (see ticksEnded): its ticks say only
   whether it outlasted a frame.
   */
  kUncounted,
};

/**
 * When a view's replays may start and where a finished recording goes, kept
 * apart from what a recording is so that it can be tested on its own
 * (RNSkGraphiteProducer is the one in use, under its lock).
 *
 * A view has at most one job in flight and one recording on its target: a
 * present replays every recording queued on the target, so a second one of
 * the view would be replayed and never shown. A recording finished while the
 * previous one is still on the target is deferred here until the view has
 * presented that one, and no job starts meanwhile. A recording made for a GPU
 * device lost since can never be presented, so it is not waited for (see
 * forgetUnpresentable).
 *
 * The pacing follows the replays, counted in the view's present ticks, one
 * for each frame the platform asks the view to present on: a frame of the
 * display the view could not present on is no tick of its own, since nothing
 * the replays do would have shown on it. A replay that finished before the
 * view's next tick after it started (see ReplayStart) keeps up with the
 * display when the next one starts at the following present, which leaves
 * the present thread alone between presents. A replay still running at its
 * second tick outlasted a frame: the next one then starts as soon as it
 * finishes, so that the replay of one frame overlaps the present of the
 * other, and a view that only started its replays at presents would show
 * every other frame. Replays that keep up, `replaysToKeepUp` of them with
 * none outlasting a frame since, bring the view back to waiting for
 * presents; a replay its ticks cannot time (see ReplayStart) counts for
 * neither, so a view whose replays start while it counts no ticks keeps its
 * pacing.
 */
template <typename Recording> class RNSkReplaySchedule {
public:
  /**
   `replaysToKeepUp`: how many replays must keep up, with none outlasting a
   frame since, for the view to wait for presents again.
   */
  explicit RNSkReplaySchedule(size_t replaysToKeepUp)
      : _replaysToKeepUp(replaysToKeepUp) {}

  /** When the next replay may start. */
  ReplayPacing pacing() const { return _pacing; }

  /** Whether a job is in flight: its frame is coming. */
  bool hasJobInFlight() const { return _job.has_value(); }

  /**
   Whether a finished recording waits for the view to present the one before
   it (see finishJob): its frame is coming too.
   */
  bool hasDeferredRecording() const {
    return _onTarget.has_value() && _onTarget->deferred.has_value();
  }

  /** Starts a job if one may start now. Returns whether it did. */
  [[nodiscard]] bool tryStartJob() {
    if (_job.has_value() || hasDeferredRecording() || waitsForPresent()) {
      return false;
    }
    _job = Job{.start = startOfJobNow(), .ticks = 0};
    return true;
  }

  /**
   The job tryStartJob() started finished a recording for the current target.
   Returns it, to submit now, unless the previous one is still on the target:
   it is then deferred until the view has presented that one.
   */
  [[nodiscard]] std::optional<Recording> finishJob(Recording recording) {
    if (_job.has_value() && keptUp(*_job)) {
      countKeptUp();
    }
    _job.reset();
    if (_onTarget.has_value()) {
      _onTarget->deferred = std::move(recording);
      return std::nullopt;
    }
    _onTarget = OnTarget{.recording = recording, .deferred = std::nullopt};
    return recording;
  }

  /**
   The job tryStartJob() started ended without a recording for the current
   target: nothing was recorded, or the recording is for a target the view
   has left.
   */
  void endJob() { _job.reset(); }

  /**
   The view is done with a recording it took off its target: it presented it,
   or skipped it as one it cannot replay. Any recording may come here (a
   client's, the last frame presented again), and a job that starts before
   the view's next tick starts at that present; only the view's own recording
   on the target lets the next one go. Returns the deferred recording, to
   submit now, if there is one.
   */
  [[nodiscard]] std::optional<Recording>
  recordingPresented(const Recording &recording) {
    _presentedSinceTick = true;
    if (!_onTarget.has_value() || _onTarget->recording != recording) {
      return std::nullopt;
    }
    return takeDeferred();
  }

  /**
   The view's present tick ended: the platform asked it to present, once a
   frame, while a frame of it was waiting or coming.
   */
  void presentTick() {
    _presentedSinceTick = false;
    _ticking = true;
    if (!_job.has_value()) {
      return;
    }
    _job->ticks++;
    if (_job->ticks >= 2) {
      _pacing = ReplayPacing::kPipelined;
      _replaysKeptUp = 0;
    }
  }

  /**
   The view asked for no more frames: nothing of it was waiting or coming,
   as far as it knew. It counts none of the frames that pass until it asks
   again, so a job in flight (one started as the view decided) and a job
   that starts meanwhile cannot keep up.
   */
  void ticksEnded() {
    _presentedSinceTick = false;
    _ticking = false;
    if (_job.has_value()) {
      _job->start = ReplayStart::kUncounted;
    }
  }

  /**
   The view's recording on the target can never be presented, as
   `unpresentable` says of it (made for a GPU device lost since: the target
   drops it with every other recording for that device once it is handed
   one, or the view skips it), so it is not waited for.
   Returns the deferred recording, to submit now, if there is one.
   */
  template <typename Unpresentable>
  [[nodiscard]] std::optional<Recording>
  forgetUnpresentable(Unpresentable &&unpresentable) {
    if (!_onTarget.has_value() || !unpresentable(_onTarget->recording)) {
      return std::nullopt;
    }
    return takeDeferred();
  }

  /**
   The view moved to another target. Its recording on the previous one is not
   coming through this view anymore (the view unbound itself from it): it is
   not waited for. Returns the deferred recording, which was made for the
   previous target, to submit there.
   */
  [[nodiscard]] std::optional<Recording> retarget() {
    std::optional<Recording> deferred;
    if (_onTarget.has_value()) {
      deferred = std::move(_onTarget->deferred);
    }
    _onTarget.reset();
    return deferred;
  }

private:
  /** The job in flight: where it started, and the ticks it has seen since. */
  struct Job {
    ReplayStart start;
    size_t ticks;
  };

  /**
   The view's recording on the target, until the view has presented it, and
   the one finished after it, until it goes to the target.
   */
  struct OnTarget {
    Recording recording;
    std::optional<Recording> deferred;
  };

  ReplayStart startOfJobNow() const {
    if (_presentedSinceTick) {
      return ReplayStart::kAtPresent;
    }
    return _ticking ? ReplayStart::kBetweenPresents : ReplayStart::kUncounted;
  }

  static bool keptUp(const Job &job) {
    switch (job.start) {
    case ReplayStart::kAtPresent:
      return job.ticks <= 1;
    case ReplayStart::kBetweenPresents:
      return job.ticks == 0;
    case ReplayStart::kUncounted:
      return false;
    }
    return false;
  }

  /** The recording on the target is done with: the deferred one takes its
   * place. */
  std::optional<Recording> takeDeferred() {
    auto deferred = std::move(_onTarget->deferred);
    if (deferred.has_value()) {
      _onTarget = OnTarget{.recording = *deferred, .deferred = std::nullopt};
    } else {
      _onTarget.reset();
    }
    return deferred;
  }

  bool waitsForPresent() const {
    switch (_pacing) {
    case ReplayPacing::kAfterPresent:
      return _onTarget.has_value();
    case ReplayPacing::kPipelined:
      return false;
    }
    return false;
  }

  void countKeptUp() {
    _replaysKeptUp++;
    if (_replaysKeptUp >= _replaysToKeepUp) {
      _pacing = ReplayPacing::kAfterPresent;
    }
  }

  const size_t _replaysToKeepUp;
  ReplayPacing _pacing = ReplayPacing::kAfterPresent;
  std::optional<Job> _job;
  // Whether the view presented a recording since its last present tick.
  bool _presentedSinceTick = false;
  // Whether the view counts its present ticks: it asked for another frame at
  // its last one, and has not asked for no more since.
  bool _ticking = false;
  // Replays that kept up since one last outlasted a frame.
  size_t _replaysKeptUp = 0;
  std::optional<OnTarget> _onTarget;
};

} // namespace RNSkia
