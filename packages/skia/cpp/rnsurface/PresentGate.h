#pragma once

#include <optional>
#include <utility>

namespace rnsurface {

/**
 * Whether a window takes a frame now, without waiting for the GPU, kept apart
 * from Dawn so that it can be tested on its own (RNSkWindowSurface is the one
 * in use, on Android).
 *
 * On Android a present waits, on the thread that presents, until the GPU is
 * done with the frame presented before it: libgui's queueBuffer waits on the
 * fence of the buffer queued last, for every Vulkan swapchain. Every canvas of
 * the process presents on one thread, so that wait holds the others up too.
 * The gate is closed for as long as that wait would last: a frame that comes
 * meanwhile is declined before the window acquires an image for it, stays
 * queued, and is tried again on the next vsync (see FrameScheduler). Nothing
 * is held, so there is nothing to give back when the window resizes or goes.
 *
 * A frame presented is done once all the work submitted before its present
 * is, other windows' included: the fence of its buffer signals then. `Gpu`
 * tracks the work submitted so far (`Work track()`) and says whether it is
 * done, without waiting (`bool isDone(const Work &)`).
 */
template <typename Gpu> class PresentGate {
public:
  using Work = typename Gpu::Work;

  explicit PresentGate(Gpu gpu = Gpu()) : _gpu(std::move(gpu)) {}

  /**
   Whether the window takes a frame: the GPU is done with the frame presented
   last, or none was. Asked before the window acquires an image.
   */
  bool isOpen() {
    if (!_previousFrame.has_value()) {
      return true;
    }
    if (!_gpu.isDone(*_previousFrame)) {
      return false;
    }
    _previousFrame.reset();
    return true;
  }

  /** A frame went to the window: the next one waits for its work. */
  void onPresented() { _previousFrame = _gpu.track(); }

  /**
   The window is gone, and its buffer queue with it: the next one has
   presented nothing yet.
   */
  void reset() { _previousFrame.reset(); }

private:
  Gpu _gpu;
  // The GPU work submitted up to the present of the frame presented last,
  // until it is done.
  std::optional<Work> _previousFrame;
};

} // namespace rnsurface
