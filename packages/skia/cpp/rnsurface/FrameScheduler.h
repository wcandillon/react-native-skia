#pragma once

namespace rnsurface {

/**
 * Decides when a view presents the recordings queued for it, on the thread
 * the view presents on. A window that shows each frame in turn (a
 * SurfaceView, a CAMetalLayer) takes the next one on the next vsync, when
 * the compositor takes its buffer. A window that shows the latest frame
 * presented when it draws and lets the others go (a TextureView) is handed
 * one frame at a time, the next once the window drew the previous one (see
 * onFrameConsumed), so that every draw gets a new frame and no frame is made
 * for nothing; that next frame is replayed ahead, as soon as it is queued,
 * and only handed over once the window drew (see Host::presentFrame and
 * Host::presentHeldFrame): replaying a frame takes milliseconds, and a frame
 * replayed only once the window drew would miss the window's next draw
 * about every other frame. One frame is held at a time; the frames behind
 * it wait, as they would otherwise be replayed for nothing. A frame for a
 * window resized since the one it shows goes on the spot in either case (see
 * requestFrame). Keeps at most one frame callback outstanding.
 *
 * The host is the platform view: it arms the vsync (postFrameCallback) and
 * presents (presentFrame, presentHeldFrame). This is the one scheduler of
 * both platforms: what FrameScheduler.java and the display link code of
 * SkiaView.mm each did before.
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
    // A frame went to the window, or is held back for it (see
    // Host::presentFrame).
    kPresented = 1,
    // Recordings are left: more are queued, or the window declined one (no
    // drawable).
    kMoreQueued = 2,
  };

  /** What the scheduler asks of the view. */
  class Host {
  public:
    virtual ~Host() = default;
    /** Calls onFrame() on the next vsync. */
    virtual void postFrameCallback() = 0;
    /**
     Presents the queued recordings: kPresented and kMoreQueued, as they
     apply. On a window that shows the latest frame, the frame is replayed
     and its GPU work submitted, but the window is only handed it by
     presentHeldFrame() (see the class comment): kPresented then says that
     a frame is held for it. A frame held already goes to the window ahead
     of the new one (the window takes the latest), so one is held at most.
     */
    virtual int presentFrame() = 0;
    /**
     Hands the window the frame presentFrame() held back for it, if any:
     whether one went to the window. Only on a window that shows the latest
     frame.
     */
    virtual bool presentHeldFrame() = 0;
  };

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
   yet, and of the one held for it), so that a window resized on every frame
   is drawn at the right size on every frame.
   */
  void requestFrame(bool forResizedWindow) {
    if (_window == Window::kNone) {
      return;
    }
    if (forResizedWindow) {
      present(/* handOver= */ true);
      return;
    }
    // A frame callback still outstanding (a retry, see present) presents the
    // new recording along with the leftovers on that vsync.
    if (_frameCallbackPosted) {
      return;
    }
    switch (_window) {
    case Window::kShowsEachFrame:
      postFrameCallback();
      break;
    case Window::kShowsLatestFrame:
      // A frame held already is as far ahead as the window takes (see the
      // class comment): this one waits for the window to draw. Otherwise it
      // is replayed now, and handed over now when the window drew everything
      // it was given, else held until it did.
      if (_frameHeld) {
        _requested = true;
      } else {
        present(/* handOver= */ false);
      }
      break;
    case Window::kNone:
      break;
    }
  }

  /** The vsync asked for with Host::postFrameCallback(). */
  void onFrame() {
    _frameCallbackPosted = false;
    if (_window == Window::kNone) {
      return;
    }
    present(/* handOver= */ false);
  }

  /**
   The window drew the frame it was given (or a later one, presented for a
   resized window): the frame held for it, if any, goes to it now, and the
   recording waiting behind that is replayed and held in its turn.
   */
  void onFrameConsumed() {
    _frameInWindow = false;
    if (_window == Window::kNone) {
      return;
    }
    if (_frameHeld) {
      _frameHeld = false;
      _frameInWindow = _host.presentHeldFrame();
    }
    if (_requested) {
      present(/* handOver= */ false);
    }
  }

  /**
   The view left its window, or the window lost its surface: the host
   removed its callbacks, the frame held went with the surface, and the
   scheduler forgets what it asked for.
   */
  void cancel() {
    _frameCallbackPosted = false;
    _frameInWindow = false;
    _frameHeld = false;
    _requested = false;
  }

  /**
   Whether a frame callback is outstanding: a host that ticks on its own (a
   display link) pauses when none is.
   */
  bool isFrameCallbackPosted() const { return _frameCallbackPosted; }

private:
  // Presents what is queued. On a window that shows the latest frame, the
  // frame replayed is handed over on the spot when asked to (handOver, for
  // a resized window) or when the window drew everything it was given, and
  // held until the window did otherwise; a frame handed over leaves nothing
  // held, so the recording behind it, if any, is replayed and held right
  // away, and the ones behind that wait for the window to draw. The others
  // (a window that shows each frame, or any the window could not take, no
  // drawable) are tried again on the next vsync.
  void present(bool handOver) {
    for (;;) {
      _requested = false;
      const int result = _host.presentFrame();
      const bool presented = (result & kPresented) != 0;
      const bool moreQueued = (result & kMoreQueued) != 0;
      if (_window != Window::kShowsLatestFrame) {
        if (moreQueued) {
          postFrameCallback();
        }
        return;
      }
      if (presented) {
        if (handOver || !_frameInWindow) {
          // A frame held before went to the window ahead of this one (see
          // Host::presentFrame): nothing is held any more.
          _frameHeld = false;
          _frameInWindow = _host.presentHeldFrame();
        } else {
          _frameHeld = true;
        }
      }
      if (!moreQueued) {
        return;
      }
      if (!presented) {
        postFrameCallback();
        return;
      }
      if (_frameHeld) {
        _requested = true;
        return;
      }
      // The frame went to the window: the next one is replayed now and held
      // for the window's next draw.
      handOver = false;
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
  // A window that shows the latest frame has one it has not drawn yet, has
  // one replayed and held for its next draw, and a request arrived while it
  // had the latter.
  bool _frameInWindow = false;
  bool _frameHeld = false;
  bool _requested = false;
};

} // namespace rnsurface
