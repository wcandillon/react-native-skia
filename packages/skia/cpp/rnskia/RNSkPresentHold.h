#pragma once

#include <optional>
#include <utility>

namespace RNSkia {

/** Whether a window holds a frame's present (see RNSkPresentHold). */
enum class PresentHold {
  /** Every frame is presented as soon as it is replayed. */
  kNone,
  /**
   The window takes one frame between two ticks, and presents it once the GPU
   has finished the frame before it.
   */
  kOncePerTickAfterPreviousFrame,
};

/** What RNSkPresentHold::presentHeldFrame() did. */
enum class HeldFrame {
  /** The window held no frame. */
  kNone,
  /** The held frame was presented. */
  kPresented,
  /**
   The GPU is still on the frame presented before it: the frame stays held
   until the GPU is done, which may come before the next tick.
   */
  kWaitingForGpu,
};

/**
 * When a window takes and presents the frames it replays, kept apart from Dawn
 * so that it can be tested on its own (RNSkWindowSurface is the one in use).
 *
 * On Android a present waits, on the thread that presents, until the GPU has
 * finished the frame presented before it: libgui's queueBuffer does, for every
 * Vulkan swapchain. And the window's buffer queue gives its compositor one
 * frame a vsync: a second frame presented in the same frame is replaced unseen
 * (a TextureView's window draws once a frame) or waits a vsync behind the first
 * (a SurfaceView). Holding, the window takes one frame between two ticks (see
 * takesFrame and allowNextPresent), so that a later one stays queued, its
 * window image not acquired, until the next; a frame taken while the GPU is
 * on the frame before it has its work submitted and its present held until a
 * later call finds that frame done, and the window takes no other frame
 * meanwhile. A frame presented is done once every work submitted before its
 * present is, other windows' included: the present's fence signals then (a
 * Vulkan semaphore covers every submit before its signal), and the window's
 * next present waits for that fence. `Gpu` tracks the work submitted so far
 * (`Work track()`) and says whether it is done, without waiting (`bool
 * isDone(const Work &)`).
 */
template <typename Gpu> class RNSkPresentHold {
public:
  using Work = typename Gpu::Work;

  RNSkPresentHold(PresentHold hold, Gpu gpu)
      : _hold(hold), _gpu(std::move(gpu)) {}

  /** Whether a replayed frame waits for its present. */
  bool hasHeldFrame() const { return _hasHeldFrame; }

  /**
   Whether the window takes a frame (see takesFrame) once `configure` applied
   what changed in its swapchain: a swapchain configured again presents or
   drops what the previous one held (see releaseFrames), so the window takes
   a frame for it whatever the previous one took since the last tick. The one
   way a window asks, so that no frame is decided on a swapchain about to
   change.
   */
  template <typename Configure>
  bool takesFrameOnceConfigured(Configure &&configure) {
    configure();
    return takesFrame();
  }

  /**
   A frame of the display asked the window to present, or the view asks for
   none for now, so that its next frame starts a frame of its own: the window
   takes a frame again.
   */
  void allowNextPresent() { _presentedSinceTick = false; }

  /**
   A frame the window took (see takesFrame) was replayed, its work submitted:
   presents it through `present` now, or holds it while the GPU is still on
   the frame presented before it.
   */
  template <typename Present> void presentOrHold(Present &&present) {
    switch (_hold) {
    case PresentHold::kNone:
      present();
      return;
    case PresentHold::kOncePerTickAfterPreviousFrame:
      if (waitOfFrame() != HeldFrame::kPresented) {
        _hasHeldFrame = true;
        return;
      }
      presentFrame(present);
      return;
    }
  }

  /**
   Presents the held frame through `present` once the GPU has finished the
   frame before it, without waiting for the GPU. Says what the held frame
   waits for when it stays held. This answer is the only one a caller decides
   on: the GPU can finish between two reads of it, and a frame read as no
   longer waiting for the GPU after another read held it would wait for the
   next tick unpresented.
   */
  template <typename Present> HeldFrame presentHeldFrame(Present &&present) {
    if (!_hasHeldFrame) {
      return HeldFrame::kNone;
    }
    const HeldFrame wait = waitOfFrame();
    if (wait != HeldFrame::kPresented) {
      return wait;
    }
    _hasHeldFrame = false;
    presentFrame(present);
    return HeldFrame::kPresented;
  }

  /**
   The swapchain the frames went to is about to change — reconfigured for a
   new size, or gone with its window: presents the held frame through
   `present` whatever it waits for, so that the window takes back the image
   the frame was replayed into while it still can, then forgets the frames as
   dropFrames() does. Dawn destroys a swapchain it replaced or was detached
   from only once the GPU is done with it: by then a reconfigured window has
   reallocated its buffers under the image, and a destroyed window's buffer
   queue is gone, so an image still acquired is freed or cancelled into
   nothing. The present may wait for the GPU to finish the frame before it.
   */
  template <typename Present> void releaseFrames(Present &&present) {
    if (_hasHeldFrame) {
      present();
    }
    dropFrames();
  }

  /**
   The swapchain the frames went to is reconfigured or gone, and the held
   frame with it; the frame presented before it is not waited for, and the
   new swapchain has presented nothing yet.
   */
  void dropFrames() {
    _hasHeldFrame = false;
    _previousFrame.reset();
    _presentedSinceTick = false;
  }

private:
  /**
   Whether the window takes a frame now: it holds none, and presented none
   since the last tick. A frame it does not take stays queued, its window
   image not acquired, until a tick: acquired and held instead, it would leave
   the tick's present to the frame before it, and every frame after it would
   go a tick late in turn.
   */
  bool takesFrame() const { return !_hasHeldFrame && !_presentedSinceTick; }

  /**
   What the frame taken last waits for before its present: kPresented when it
   may go now.
   */
  HeldFrame waitOfFrame() {
    if (_previousFrame.has_value() && !_gpu.isDone(*_previousFrame)) {
      return HeldFrame::kWaitingForGpu;
    }
    _previousFrame.reset();
    return HeldFrame::kPresented;
  }

  template <typename Present> void presentFrame(Present &present) {
    present();
    _previousFrame = _gpu.track();
    _presentedSinceTick = true;
  }

  const PresentHold _hold;
  Gpu _gpu;
  bool _hasHeldFrame = false;
  // The GPU work submitted up to the present of the frame presented last, its
  // fence, until it is done.
  std::optional<Work> _previousFrame;
  // Whether the window presented a frame since the last tick allowed one.
  bool _presentedSinceTick = false;
};

} // namespace RNSkia
