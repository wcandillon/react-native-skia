#pragma once

#include <algorithm>
#include <chrono>

namespace rnsurface {

/**
 * Decides when a view presents the recordings queued for it, on the thread
 * the view presents on. A window that shows each frame in turn (a
 * SurfaceView, a CAMetalLayer) takes the next one on the next vsync, when
 * the compositor takes its buffer. A window that shows the latest frame
 * presented when it draws and lets the others go (a TextureView) gets one
 * frame at a time, the next once the window drew the previous one (see
 * onFrameConsumed), so that every draw gets a new frame and no frame is made
 * for nothing. A frame for a window resized since the one it shows goes on
 * the spot in either case (see requestFrame). While a replay is in flight it
 * asks for every vsync, each a tick that paces the replays (see
 * RNSkReplaySchedule); a window that has yet to draw the frame it was given
 * only ticks on it (see Host::tickOnVsync). A frame the window holds until
 * the GPU finishes the one before it is presented a moment later, alone (see
 * onHeldFrameRetry), and a redraw's frames reach the scheduler as a present's
 * do (see onRedrawn). Keeps at most one frame callback and one held frame
 * retry outstanding.
 *
 * The host is the platform view: it arms the vsync (postFrameCallback) and
 * the held frame retry (postHeldFrameRetry), and presents (presentFrame),
 * knowing what a present came from (see PresentOn). This is the one
 * scheduler of both platforms: what FrameScheduler.java and the display link
 * code of SkiaView.mm each did before.
 */
class FrameScheduler {
public:
  /** What the window shows of the frames presented to it. */
  enum class Window {
    // No backing view yet: there is no surface to present on.
    kNone,
    // Each frame in turn: a SurfaceView, a CAMetalLayer.
    kShowsEachFrame,
    // The latest frame presented, at each of its draws: a TextureView.
    kShowsLatestFrame,
  };

  /** What Host::presentFrame reports, as a mask. */
  enum PresentResult : int {
    kNothingPresented = 0,
    // A frame went to the window.
    kPresented = 1,
    // A frame is left for a later frame: more were queued, the window holds
    // one, or it could not take one (no drawable).
    kMoreQueued = 2,
    // A replay is in flight: the host asks again on every frame, each a tick
    // that paces the replays (see RNSkReplaySchedule).
    kReplayComing = 4,
    // The window holds a frame until the GPU finishes the frame before it,
    // which no event announces: the scheduler has it presented a moment
    // later rather than at the next frame (see onHeldFrameRetry).
    kHeldForGpu = 8,
  };

  /** What a present came from. */
  enum class PresentOn {
    // A recording was just submitted: no frame of the display asked for it.
    kRequest,
    // A frame of the display (a display link, a Choreographer's vsync).
    kVsync,
    // A window that shows the latest frame presented drew the frame it had.
    kWindowDraw,
    // The moment after a present that left a frame held for the GPU: the
    // held frame alone goes, once the GPU is done (see onHeldFrameRetry).
    kHeldFrameRetry,
  };

  /** What the scheduler asks of the view. */
  class Host {
  public:
    virtual ~Host() = default;
    /** Calls onFrame() on the next vsync. */
    virtual void postFrameCallback() = 0;
    /** Presents the queued recordings: kPresented, kMoreQueued and the rest,
     * as they apply, for a present that came from `on`. */
    virtual int presentFrame(PresentOn on) = 0;
    /**
     A vsync passed while the window has yet to draw the frame it was given:
     the view's present tick, and nothing presented. kReplayComing while a
     replay is in flight.
     */
    virtual int tickOnVsync() = 0;
    /** Calls onHeldFrameRetry() once `delay` has passed. */
    virtual void postHeldFrameRetry(std::chrono::milliseconds delay) = 0;
  };

  // The GPU finishing a frame is no event the view hears, so a held frame is
  // polled for: soon at first, then less often while the GPU stays busy.
  static constexpr std::chrono::milliseconds kFirstHeldFrameRetryDelay{1};
  static constexpr std::chrono::milliseconds kLongestHeldFrameRetryDelay{4};

  explicit FrameScheduler(Host &host) : _host(host) {}

  FrameScheduler(const FrameScheduler &) = delete;
  FrameScheduler &operator=(const FrameScheduler &) = delete;

  /** What the window shows, known once the backing view exists. */
  void setWindow(Window window) { _window = window; }

  Window window() const { return _window; }

  /** A recording was submitted. */
  void requestFrame() { requestFrame(false); }

  /**
   A recording was submitted. With forResizedWindow, the window was resized
   since the frame it shows was made, so it shows that frame stretched to
   its size, and the recording is for its size: it is presented on the spot,
   ahead of the vsync or the draw it would otherwise wait for (a window that
   shows the latest frame takes it in place of the one it has not drawn
   yet), so that a window resized on every frame is drawn at the right size
   on every frame.
   */
  void requestFrame(bool forResizedWindow) {
    if (_window == Window::kNone) {
      return;
    }
    if (forResizedWindow) {
      present(PresentOn::kRequest);
      return;
    }
    // A retry still outstanding presents the new recording along with the
    // leftovers on that vsync; a vsync asked for only to tick does not.
    if (_retryPosted) {
      return;
    }
    switch (_window) {
    case Window::kShowsEachFrame:
      postFrameCallback();
      break;
    case Window::kShowsLatestFrame:
      if (_frameInWindow) {
        _requested = true;
      } else {
        present(PresentOn::kRequest);
      }
      break;
    case Window::kNone:
      break;
    }
  }

  /**
   The vsync asked for with Host::postFrameCallback(). A window that has yet
   to draw the frame it was given takes no other: the vsync only ticks, and a
   frame left over for it waits for that draw.
   */
  void onFrame() {
    const bool retrying = _retryPosted;
    _frameCallbackPosted = false;
    _retryPosted = false;
    switch (_window) {
    case Window::kNone:
      return;
    case Window::kShowsLatestFrame:
      if (_frameInWindow) {
        if (retrying) {
          _requested = true;
        }
        if ((_host.tickOnVsync() & kReplayComing) != 0) {
          postFrameCallback();
        }
        return;
      }
      break;
    case Window::kShowsEachFrame:
      break;
    }
    present(PresentOn::kVsync);
  }

  /**
   The window drew the frame it was given (or a later one, presented for a
   resized window): the recording waiting for that, if any, goes to it now.
   */
  void onFrameConsumed() {
    _frameInWindow = false;
    if (_window == Window::kNone || !_requested) {
      return;
    }
    present(PresentOn::kWindowDraw);
  }

  /**
   The view presented on its own, for a redraw: what it left over, queued or
   held for the GPU, is presented as after a present of the scheduler's, and
   a frame it put in a window that shows the latest frame waits for the
   window to draw it.
   */
  void onRedrawn(int result) {
    if (_window == Window::kNone) {
      return;
    }
    onPresented(result);
  }

  /**
   The moment after a present that left a frame held for the GPU (see
   Host::postHeldFrameRetry): presents the held frame once the GPU is done,
   unless the window has yet to draw the frame it was given, whose draw
   presents it. A retry outstanding when a vsync presented the frame finds
   none held and presents nothing.
   */
  void onHeldFrameRetry() {
    _heldFrameRetryPosted = false;
    if (_window == Window::kNone ||
        (_window == Window::kShowsLatestFrame && _frameInWindow)) {
      return;
    }
    present(PresentOn::kHeldFrameRetry);
  }

  /**
   The view left its window, or the window lost its surface: the scheduler
   forgets what it asked for. The host removes its frame callback, or, where
   a vsync has no cancel, does not call onFrame() for one that is no longer
   asked for (see isFrameCallbackPosted), and the same for its held frame
   retry (see isHeldFrameRetryPosted).
   */
  void cancel() {
    _frameCallbackPosted = false;
    _retryPosted = false;
    _heldFrameRetryPosted = false;
    _heldFrameRetryDelay = kFirstHeldFrameRetryDelay;
    _frameInWindow = false;
    _requested = false;
  }

  /**
   Whether a frame callback is outstanding: a host that ticks on its own (a
   display link) pauses when none is.
   */
  bool isFrameCallbackPosted() const { return _frameCallbackPosted; }

  /**
   Whether a held frame retry is outstanding: a host whose retry has no
   cancel calls onHeldFrameRetry() only while one is.
   */
  bool isHeldFrameRetryPosted() const { return _heldFrameRetryPosted; }

private:
  void present(PresentOn on) {
    _requested = false;
    onPresented(_host.presentFrame(on));
  }

  // A frame left over is never presented straight away: a window that shows
  // the latest frame and has one it has not drawn yet presents it once it
  // drew that one; any other (a window that shows each frame, or a frame the
  // window could not take or holds) is tried again on the next vsync, and one
  // held for the GPU alone also a moment later. A replay coming keeps the
  // vsync asked for, its tick, and while the window has a frame to draw lets
  // that draw present what comes.
  void onPresented(int result) {
    if ((result & kPresented) != 0 && _window == Window::kShowsLatestFrame) {
      _frameInWindow = true;
    }
    const bool drawPresentsNext =
        _window == Window::kShowsLatestFrame && _frameInWindow;
    if ((result & kMoreQueued) != 0) {
      if (drawPresentsNext) {
        _requested = true;
      } else {
        _retryPosted = true;
        postFrameCallback();
      }
    }
    if ((result & kHeldForGpu) == 0) {
      _heldFrameRetryDelay = kFirstHeldFrameRetryDelay;
    } else if (!_heldFrameRetryPosted) {
      _heldFrameRetryPosted = true;
      _host.postHeldFrameRetry(_heldFrameRetryDelay);
      _heldFrameRetryDelay =
          std::min(_heldFrameRetryDelay * 2, kLongestHeldFrameRetryDelay);
    }
    if ((result & kReplayComing) != 0) {
      if (drawPresentsNext) {
        _requested = true;
      }
      postFrameCallback();
    }
  }

  void postFrameCallback() {
    if (!_frameCallbackPosted) {
      _frameCallbackPosted = true;
      _host.postFrameCallback();
    }
  }

  Host &_host;
  Window _window = Window::kNone;
  bool _frameCallbackPosted = false;
  // Whether the frame callback outstanding retries a frame that is left,
  // rather than only ticking for a replay that is coming.
  bool _retryPosted = false;
  bool _heldFrameRetryPosted = false;
  // The delay of the next retry while the window keeps a frame held for the
  // GPU.
  std::chrono::milliseconds _heldFrameRetryDelay = kFirstHeldFrameRetryDelay;
  // A window that shows the latest frame has one it has not drawn yet, and
  // something waits for that draw: a recording requested, a frame left over
  // or a replay coming.
  bool _frameInWindow = false;
  bool _requested = false;
};

} // namespace rnsurface
