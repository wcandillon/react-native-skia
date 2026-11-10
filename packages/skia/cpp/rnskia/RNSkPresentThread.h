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
#if defined(__ANDROID__)
/**
 * Attaches the calling thread to the JVM for good (JniPlatformContext.cpp).
 * The first task of the present thread: the Java calls made from it (a
 * posted Runnable, the frame rate vote of each frame) would otherwise each
 * attach and detach it, a java.lang.Thread made and dropped per frame.
 */
void attachPresentThread();
#endif

inline rnsurface::RenderThread &presentThread() {
  // Never destroyed: other threads may still post while the process exits.
  static auto *thread = []() {
    auto *made = new rnsurface::RenderThread("RNSkia Present");
#if defined(__ANDROID__)
    made->post(attachPresentThread);
#endif
    return made;
  }();
  return *thread;
}

} // namespace RNSkia
