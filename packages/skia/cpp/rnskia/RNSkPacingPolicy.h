#pragma once

#include <cstdlib>
#include <string>

#if defined(__ANDROID__)
#include <sys/system_properties.h>
#endif

#include "rnsurface/FrameScheduler.h"

namespace RNSkia {

/**
 * The pacing policy of the platform (see rnsurface::FrameScheduler::Policy),
 * but for what the window shows, which each view knows once it has one. On
 * Android a present waits for the GPU to finish the frame presented before
 * it, so a frame that comes meanwhile has its present held; a Metal present
 * does not wait. The depth follows the measured time of the recordings.
 *
 * For measuring one policy against another on the same build, a comma
 * separated list overrides it, read once per process: the system property
 * `debug.rnskia.pacing` on Android (`adb shell setprop debug.rnskia.pacing
 * decline,two`), the environment variable `RNSKIA_PACING` elsewhere. `hold`,
 * `decline` and `nowait` choose what a present does while the GPU is on the
 * frame before (`nowait` presents and waits, as before there was a policy);
 * `adaptive` and `two` choose the depth; `log` has each view log what its
 * scheduler did, once a second while it presents (see RNSkView::logPacing).
 * The benchmark runner sets it with `--pacing` (apps/example/benchmarks).
 */

/** Whether the override list names `word`. */
inline bool pacingOverride(const char *word) {
  static const std::string overrides = []() {
#if defined(__ANDROID__)
    char value[PROP_VALUE_MAX] = {0};
    __system_property_get("debug.rnskia.pacing", value);
    return "," + std::string(value) + ",";
#else
    const char *value = std::getenv("RNSKIA_PACING");
    return "," + std::string(value != nullptr ? value : "") + ",";
#endif
  }();
  return overrides.find(std::string(",") + word + ",") != std::string::npos;
}

/** Whether the views log what their schedulers do. */
inline bool platformPacingLogs() {
  static const bool logs = pacingOverride("log");
  return logs;
}

/** The policy every view of the process paces its frames with. */
inline rnsurface::FrameScheduler::Policy platformPacingPolicy() {
  using Scheduler = rnsurface::FrameScheduler;
  static const Scheduler::Policy policy = []() {
    Scheduler::Policy made;
#if defined(__ANDROID__)
    made.acknowledgement = Scheduler::Acknowledgement::kHoldsPresent;
#else
    made.acknowledgement = Scheduler::Acknowledgement::kNone;
#endif
    if (pacingOverride("hold")) {
      made.acknowledgement = Scheduler::Acknowledgement::kHoldsPresent;
    } else if (pacingOverride("decline")) {
      made.acknowledgement = Scheduler::Acknowledgement::kDeclinesFrame;
    } else if (pacingOverride("nowait")) {
      made.acknowledgement = Scheduler::Acknowledgement::kNone;
    }
    if (pacingOverride("two")) {
      made.depth = Scheduler::Depth::kTwo;
    } else if (pacingOverride("adaptive")) {
      made.depth = Scheduler::Depth::kAdaptive;
    }
    return made;
  }();
  return policy;
}

} // namespace RNSkia
