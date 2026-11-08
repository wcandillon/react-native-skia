#pragma once

#include "rnsurface/RenderThread.h"

namespace RNSkia {

/**
 * The thread every canvas of the process presents on (see
 * rnsurface::RenderThread), started on first use and never stopped: the
 * platform views post the window lifecycle and the presents to it, the
 * frame scheduler and the vsync live on it. One per library instance: a
 * compile stall of a Skia present must not delay react-native-webgpu's.
 */
inline rnsurface::RenderThread &presentThread() {
  // Never destroyed: other threads may still post while the process exits.
  static auto *thread = new rnsurface::RenderThread("RNSkia Present");
  return *thread;
}

} // namespace RNSkia
