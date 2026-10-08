#pragma once

#include <android/native_window.h>

#include <cstdint>
#include <memory>

namespace RNSkia {

// A SurfaceView sits outside its window's frame-rate vote, so an adaptive
// display can hold an animating canvas at 60 Hz. This votes the display's
// highest rate while frames are presented and withdraws it once they stop:
// SurfaceFlinger keeps a voting layer active even when it no longer draws.
class SurfaceFrameRateVote {
public:
  SurfaceFrameRateVote();
  ~SurfaceFrameRateVote();

  SurfaceFrameRateVote(const SurfaceFrameRateVote &) = delete;
  SurfaceFrameRateVote &operator=(const SurfaceFrameRateVote &) = delete;

  void attach(ANativeWindow *window, float maxRefreshRate);

  // Called on the thread that renders the canvas.
  void onFramePresented();

  void detach();

private:
  struct State;
  std::shared_ptr<State> _state;
};

} // namespace RNSkia
