#pragma once

#include <mutex>

namespace RNSkia {

/** What became of an image presented onto a surface (see presentImage). */
enum class ImagePresent {
  /** The image went to the surface. */
  kPresented,
  /**
   The surface could take a frame but no image was made for it: what the
   image was to be made from is consumed.
   */
  kConsumed,
  /**
   The surface could not take a frame right now, as presentRecordings()
   declines one: nothing is consumed.
   */
  kDeclined,
};

/**
 Presents an image a window's present makes for it (see
 RNSkWindowSurface::presentImage). `takesFrame` decides under the window's
 lock whether the window takes a frame, so that a window that takes none
 costs no replay; `makeImage` replays without the lock, so that an attach or
 a detach waiting on it never waits for a replay; and `takesFrame` decides
 again under the lock before `present` puts the image on the window, which
 either may have changed meanwhile: a window that no longer takes the frame
 declines it with the replay made.
 */
template <typename Lock, typename TakesFrame, typename MakeImage,
          typename Present>
ImagePresent presentMadeImage(Lock &lock, TakesFrame &&takesFrame,
                              MakeImage &&makeImage, Present &&present) {
  {
    std::lock_guard<Lock> guard(lock);
    if (!takesFrame()) {
      return ImagePresent::kDeclined;
    }
  }
  auto image = makeImage();
  if (!image) {
    return ImagePresent::kConsumed;
  }
  std::lock_guard<Lock> guard(lock);
  if (!takesFrame()) {
    return ImagePresent::kDeclined;
  }
  return present(image);
}

} // namespace RNSkia
