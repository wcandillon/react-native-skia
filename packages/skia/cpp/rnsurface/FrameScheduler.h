#pragma once

// DEBUG (debug-gpf-scheduler): temporary scheduler tracing, not for merge.
#ifndef GPF_LOG
#if defined(__ANDROID__)
#include <android/log.h>
#define GPF_LOG(...) __android_log_print(ANDROID_LOG_INFO, "GPFDBG", __VA_ARGS__)
#else
#define GPF_LOG(...)
#endif
#endif

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
 * the spot in either case (see requestFrame). Keeps at most one frame
 * callback outstanding.
 *
 * The host is the platform view: it arms the vsync (postFrameCallback) and
 * presents (presentFrame). This is the one scheduler of both platforms:
 * what FrameScheduler.java and the display link code of SkiaView.mm each
 * did before.
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
    /** Presents the queued recordings: kPresented and kMoreQueued, as they
     * apply. */
    virtual int presentFrame() = 0;
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
   yet), so that a window resized on every frame is drawn at the right size
   on every frame.
   */
  void requestFrame(bool forResizedWindow) {
    GPF_LOG("%p requestFrame resized=%d window=%d posted=%d inWindow=%d requested=%d",
            this, forResizedWindow, static_cast<int>(_window),
            _frameCallbackPosted, _frameInWindow, _requested);
    if (_window == Window::kNone) {
      return;
    }
    if (forResizedWindow) {
      present();
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
      if (_frameInWindow) {
        _requested = true;
      } else {
        present();
      }
      break;
    case Window::kNone:
      break;
    }
  }

  /** The vsync asked for with Host::postFrameCallback(). */
  void onFrame() {
    GPF_LOG("%p onFrame inWindow=%d requested=%d", this, _frameInWindow,
            _requested);
    _frameCallbackPosted = false;
    if (_window == Window::kNone) {
      return;
    }
    present();
  }

  /**
   The window drew the frame it was given (or a later one, presented for a
   resized window): the recording waiting for that, if any, goes to it now.
   */
  void onFrameConsumed() {
    GPF_LOG("%p onFrameConsumed requested=%d posted=%d", this, _requested,
            _frameCallbackPosted);
    _frameInWindow = false;
    if (_window == Window::kNone || !_requested) {
      return;
    }
    present();
  }

  /**
   The view left its window, or the window lost its surface: the host
   removed its callbacks, and the scheduler forgets what it asked for.
   */
  void cancel() {
    GPF_LOG("%p cancel", this);
    _frameCallbackPosted = false;
    _frameInWindow = false;
    _requested = false;
  }

  /**
   Whether a frame callback is outstanding: a host that ticks on its own (a
   display link) pauses when none is.
   */
  bool isFrameCallbackPosted() const { return _frameCallbackPosted; }

private:
  // Recordings left over are never presented straight away: a window that
  // shows the latest frame waits for the window to draw the frame just
  // presented; the others (a window that shows each frame, or any the
  // window could not take, no drawable) are tried again on the next vsync.
  void present() {
    _requested = false;
    const int result = _host.presentFrame();
    const bool inWindow =
        (result & kPresented) != 0 && _window == Window::kShowsLatestFrame;
    if (inWindow) {
      _frameInWindow = true;
    }
    GPF_LOG("%p present result=%d inWindow=%d -> %s", this, result, inWindow,
            (result & kMoreQueued) == 0
                ? "idle"
                : (inWindow ? "wait-consumed" : "post-vsync"));
    if ((result & kMoreQueued) == 0) {
      return;
    }
    if (inWindow) {
      _requested = true;
    } else {
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
  // A window that shows the latest frame has one it has not drawn yet, and
  // a request arrived while it had.
  bool _frameInWindow = false;
  bool _requested = false;
};

} // namespace rnsurface
