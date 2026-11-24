#pragma once

#include <atomic>

#include "RNSkWindowState.h"

namespace RNSkia {

/**
 * The redraw a view owes its window: requested from any thread, run on the
 * thread the view presents on, at most one waiting at a time. A redraw takes
 * the request before it reads the window, so that a request made from then
 * on, an attach's among them, waits for a redraw of its own, and decides on
 * one read of the window. What no window or no GPU device can show is
 * dropped: attaching a window and replacing the device each ask again. What a
 * window that cannot present right now misses is owed until it can; once it
 * is owed, the window is read again, as it may have become able to meanwhile.
 */
class RNSkRedrawRequest {
public:
  /** What start() decided. */
  enum class Start {
    // Present, onto the window as start() read it.
    kPresent,
    // Nothing to present now.
    kSkip,
    // Nothing to present now, and the caller posts the redraw again: the
    // window became able to present while the redraw found it could not.
    kPostAgain,
  };

  /** Any thread. Whether the caller posts the redraw: none is waiting. */
  [[nodiscard]] bool request() { return !_waiting.exchange(true); }

  /** Any thread. Whether a redraw was requested and has not started. */
  bool isWaiting() const { return _waiting; }

  /**
   Present thread: starts a redraw on one read of the window,
   `window.readState(info)`, which describes it in `info` when it is ready. A
   window that cannot present is read once more, without `info`, once the
   redraw is owed.
   */
  template <typename Window, typename Info>
  [[nodiscard]] Start start(Window &window, Info *info) {
    _waiting = false;
    switch (window.readState(info)) {
    case RNSkWindowState::kNone:
    case RNSkWindowState::kNoDevice:
      return Start::kSkip;
    case RNSkWindowState::kCannotPresent:
      _owed = true;
      // Able to present since the read: the platform view found nothing owed.
      return window.readState(static_cast<Info *>(nullptr)) ==
                         RNSkWindowState::kReady &&
                     onCanPresent()
                 ? Start::kPostAgain
                 : Start::kSkip;
    case RNSkWindowState::kReady:
      _owed = false;
      return Start::kPresent;
    }
    return Start::kSkip;
  }

  /**
   Any thread: the window can present again. Whether the caller posts the
   redraw owed since a redraw found it could not.
   */
  [[nodiscard]] bool onCanPresent() {
    return _owed.exchange(false) && request();
  }

private:
  std::atomic<bool> _waiting{false};
  std::atomic<bool> _owed{false};
};

} // namespace RNSkia
