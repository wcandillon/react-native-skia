#pragma once

#include <atomic>
#include <cstdint>

#include "RNSkWindowState.h"
#include "rnsurface/FrameScheduler.h"

namespace RNSkia {

/**
 * What a window is through its life: attached or not, with a Dawn surface or
 * without one (it is away while a lost GPU device is replaced), its swapchain
 * due to be configured, a present deferred, the work of its last present
 * still with the GPU, taken back by the platform. RNSkWindowSurface holds
 * the Dawn objects and makes the calls; what follows from what is decided
 * here, with no Dawn in it, so that it can be checked on a host (see
 * cpp-tests/WindowLifecycleTest.cpp).
 *
 * Each entry is something that happened to the window, or a question about
 * it; an entry that asks the caller for something says so in what it
 * returns. Nothing here calls back, but for the questions an entry is handed
 * (whether the GPU is done, whether the window can present), which it asks
 * only when the answer matters.
 *
 * Threading: the presenting thread (see RNSkWindowSurface), but for abandon()
 * and isAbandoned(), which any thread may call.
 */
class RNSkWindowLifecycle {
public:
  using WaitForPreviousWork = rnsurface::FrameScheduler::WaitForPreviousWork;

  /** What the window's surface is to the GPU device in use. */
  enum class SurfaceCheck {
    // Made on the device in use.
    kUsable,
    // Made on a device replaced since: let go of by the next sweep (see
    // dropSurfaceOn), not configured on a device that is gone.
    kStale,
    // None: the caller makes one on the device in use.
    kMissing,
  };

  /** What becomes of a frame replayed onto the window's texture. */
  enum class Offer {
    // The platform is taking the window back: the frame is not presented.
    kDeclined,
    // Its work is submitted and its present deferred (see
    // takeDeferredPresent).
    kDeferred,
    // The caller presents it now.
    kPresent,
  };

  // The window ---------------------------------------------------------------

  /** Whether a window is attached. Its surface may be away. */
  bool isAttached() const { return _window != nullptr; }

  /** The window attached, nullptr without one. */
  void *window() const { return _window; }

  /** Whether `window` is the window attached. */
  bool isWindow(const void *window) const {
    return window != nullptr && window == _window;
  }

  /**
   A window is attached, in place of the one before, if any, whose surface
   and handle the caller has let go of. The same window attached again keeps
   the frame it shows; another shows nothing yet. The abandon, if any, stays
   (see abandon).
   */
  void attach(void *window) {
    const bool showsFrame = _showsFrame && window == _window;
    release();
    _window = window;
    _showsFrame = showsFrame;
  }

  /**
   The window goes, with its surface, the frame it held and what was known
   of its last present: the caller lets go of the surface, then gives the
   handle back. The abandon, if any, stays.
   */
  void release() {
    _hasSurface = false;
    _presentDeferred = false;
    _hasPresentedWork = false;
    _needsConfigure = false;
    _generation = 0;
    _window = nullptr;
    _showsFrame = false;
  }

  /** release(), and the abandon is taken down: the detach it waited for. */
  void detach() {
    release();
    _abandoned.store(false, std::memory_order_release);
  }

  /**
   The platform is taking the window back before detach() runs: nothing is
   presented onto it from now. Only detach() takes it down. Any thread.
   */
  void abandon() { _abandoned.store(true, std::memory_order_release); }

  /** Any thread. */
  bool isAbandoned() const {
    return _abandoned.load(std::memory_order_acquire);
  }

  /**
   What a frame presented now would meet (see RNSkWindowState).
   `canPresent()` is asked only of an attached window with a device.
   */
  template <typename CanPresent>
  RNSkWindowState state(bool deviceLost, CanPresent &&canPresent) const {
    if (_window == nullptr) {
      return RNSkWindowState::kNone;
    }
    if (deviceLost) {
      return RNSkWindowState::kNoDevice;
    }
    if (!canPresent()) {
      return RNSkWindowState::kCannotPresent;
    }
    return RNSkWindowState::kReady;
  }

  // The surface --------------------------------------------------------------

  /** Whether the window has a Dawn surface. */
  bool hasSurface() const { return _hasSurface; }

  /**
   The generation of the GPU device the surface was last made on, or asked
   for on (see bindDevice); 0 for a window that never asked, was released
   since, or lost its surface to a sweep (see dropSurfaceOn).
   */
  uint64_t generation() const { return _generation; }

  /** What the surface is to the device in use, of that generation. */
  SurfaceCheck checkSurface(uint64_t currentGeneration) const {
    if (!_hasSurface) {
      return SurfaceCheck::kMissing;
    }
    return _generation == currentGeneration ? SurfaceCheck::kUsable
                                            : SurfaceCheck::kStale;
  }

  /** The caller is about to make a surface on the device of `generation`. */
  void bindDevice(uint64_t generation) { _generation = generation; }

  /**
   The surface was made, on the device bound: its swapchain is to be
   configured (see needsConfigure).
   */
  void surfaceMade() {
    _hasSurface = true;
    _needsConfigure = true;
  }

  /**
   The device of `generation` was replaced: a window whose surface is on it
   lets go of that surface, with the frame it held, and keeps the window.
   Returns whether this one does, for the caller to let go of the surface.
   */
  bool dropSurfaceOn(uint64_t generation) {
    if (_generation != generation) {
      return false;
    }
    _hasSurface = false;
    _presentDeferred = false;
    _hasPresentedWork = false;
    _generation = 0;
    return true;
  }

  /** The window took a new size: its swapchain is to be configured again. */
  void resized() { _needsConfigure = true; }

  /** Whether the swapchain is to be configured before the next frame. */
  bool needsConfigure() const { return _needsConfigure; }

  /**
   The caller is configuring the swapchain: made again, it takes the image
   the previous one had acquired, and the frame whose present was deferred
   with it.
   */
  void configured() {
    _needsConfigure = false;
    _presentDeferred = false;
  }

  // The frames ---------------------------------------------------------------

  /** Where a frame waits while the GPU is on the frame before it. */
  void setWaitForPreviousWork(WaitForPreviousWork waitForPreviousWork) {
    _waitForPreviousWork = waitForPreviousWork;
  }

  WaitForPreviousWork getWaitForPreviousWork() const {
    return _waitForPreviousWork;
  }

  /** Defers the present of the next frame, where one can be deferred. */
  void deferNextPresent(bool defer) { _deferNextPresent = defer; }

  /**
   Whether the window takes a frame: it has no present deferred, or the
   swapchain that frame was replayed into is about to be configured again.
   */
  bool takesFrame() const { return !_presentDeferred || _needsConfigure; }

  /** Whether a frame's present is deferred. */
  bool hasDeferredPresent() const { return _presentDeferred; }

  /** Whether the window shows a frame presented onto it. */
  bool showsFrame() const { return _showsFrame; }

  /** How many frames went to the window so far, over its windows. */
  uint64_t presentCount() const { return _presentCount; }

  /**
   Whether the GPU is done with the frame presented last: true when none
   was, or none is remembered (see presented). `gpuDone()` is asked only
   while one is, and its yes is remembered.
   */
  template <typename GpuDone> bool isPreviousWorkDone(GpuDone &&gpuDone) {
    if (!_hasPresentedWork) {
      return true;
    }
    if (!gpuDone()) {
      return false;
    }
    _hasPresentedWork = false;
    return true;
  }

  /**
   A frame was replayed onto the window's texture and its work submitted:
   what becomes of it. `gpuDone` as for isPreviousWorkDone().
   */
  template <typename GpuDone> Offer offerFrame(GpuDone &&gpuDone) {
    if (isAbandoned()) {
      return Offer::kDeclined;
    }
    if (_waitForPreviousWork == WaitForPreviousWork::kBeforePresent &&
        (_deferNextPresent || !isPreviousWorkDone(gpuDone))) {
      _presentDeferred = true;
      return Offer::kDeferred;
    }
    return Offer::kPresent;
  }

  /**
   The deferred present is due. Returns whether the caller presents: not
   when none was deferred, and the frame is lost when the surface is gone,
   the platform took the window back, or the device was lost, replaced or
   not (the surface stays on the lost one until a sweep).
   */
  bool takeDeferredPresent(bool deviceLost, uint64_t currentGeneration) {
    if (!_presentDeferred) {
      return false;
    }
    _presentDeferred = false;
    return _hasSurface && !isAbandoned() && !deviceLost &&
           _generation == currentGeneration;
  }

  /**
   The caller presented a frame. Returns whether the next present waits for
   this one's work, which the caller then takes note of (see
   rememberPresentedWork).
   */
  [[nodiscard]] bool presented() {
    _showsFrame = true;
    _presentCount++;
    return _waitForPreviousWork != WaitForPreviousWork::kNever;
  }

  /** The caller holds the work submitted up to the last present. */
  void rememberPresentedWork() { _hasPresentedWork = true; }

private:
  void *_window = nullptr;
  bool _hasSurface = false;
  uint64_t _generation = 0;
  bool _needsConfigure = false;
  bool _showsFrame = false;
  std::atomic<bool> _abandoned{false};
  WaitForPreviousWork _waitForPreviousWork = WaitForPreviousWork::kNever;
  bool _presentDeferred = false;
  bool _deferNextPresent = false;
  bool _hasPresentedWork = false;
  uint64_t _presentCount = 0;
};

} // namespace RNSkia
