#pragma once

#include <time.h>

#include "rnsurface/FrameScheduler.h"

namespace rnsurface {

/**
 * The time, on the clock the frame signals of the platform are on: a
 * CADisplayLink's timestamps are mach absolute time, an AChoreographer's
 * frame times CLOCK_MONOTONIC. What a view measures its stages with and
 * reads before each entry of its FrameScheduler.
 */
inline FrameScheduler::Nanos frameClockNow() {
#if defined(__APPLE__)
  return static_cast<FrameScheduler::Nanos>(
      clock_gettime_nsec_np(CLOCK_UPTIME_RAW));
#else
  timespec now{};
  clock_gettime(CLOCK_MONOTONIC, &now);
  return static_cast<FrameScheduler::Nanos>(now.tv_sec) * 1000000000LL +
         static_cast<FrameScheduler::Nanos>(now.tv_nsec);
#endif
}

} // namespace rnsurface
