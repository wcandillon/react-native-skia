#pragma once

#include <chrono>

namespace RNSkia {

/**
 Waits `slice` at a time until the drawing is done, true, or its device is no
 longer current, false: a GPU that stops running work loses its device.
 */
template <typename WaitFor, typename IsCurrent>
bool waitForDrawing(WaitFor &&waitFor, IsCurrent &&isCurrent,
                    std::chrono::milliseconds slice) {
  for (;;) {
    if (waitFor(slice)) {
      return true;
    }
    if (!isCurrent()) {
      return false;
    }
  }
}

} // namespace RNSkia
