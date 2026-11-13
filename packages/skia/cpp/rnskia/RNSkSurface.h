#pragma once

#include <functional>
#include <vector>

#include "RNSkGraphiteTargetInfo.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkCanvas.h"
#include "include/core/SkImage.h"
#include "include/core/SkRect.h"
#include "include/core/SkSamplingOptions.h"
#include "include/gpu/graphite/Recording.h"

#pragma clang diagnostic pop

namespace RNSkia {

/**
 * What a view presents into: the window of the platform view
 * (RNSkWindowSurface) or an offscreen surface (RNSkOffscreenSurface). Only
 * what RNSkView::present needs from either: the description of the target
 * texture and the replay onto it.
 */
class RNSkSurface {
public:
  virtual ~RNSkSurface() = default;

  /** Width of the surface, in pixels. */
  virtual int getWidth() = 0;

  /** Height of the surface, in pixels. */
  virtual int getHeight() = 0;

  /**
   Describes the current target texture. Safe to call from any thread;
   returns false while there is no surface to describe.
   */
  virtual bool getTargetInfo(RNSkGraphiteTargetInfo *info) = 0;

  /**
   Replays the recordings, in order, onto the target texture and presents
   it. The target is the one the caller read with getTargetInfo() and chose
   the recordings for: a surface that is no longer that target (resized from
   another thread since) declines, as the recordings would not fit it.
   Called on the thread that presents on the surface. Returns false when the
   surface cannot present right now (there is none, the app is in the
   background, or the surface is not the target given): nothing was
   consumed.
   */
  virtual bool presentRecordings(
      const RNSkGraphiteTargetInfo &target,
      const std::vector<skgpu::graphite::Recording *> &recordings) = 0;

  /** What became of an image presented onto the surface (see presentImage). */
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
   Draws the image `makeImage` makes onto the target texture (see drawOnto)
   and presents it. Same target and thread as presentRecordings(). Used for a
   recording whose size or color space differs from the target's, which
   `makeImage` replays into a texture of its own (see RNSkView::present): it
   is called once the surface takes the frame, so that a surface that
   declines costs no replay, and before the target texture is acquired, so
   that none is acquired for a frame nothing is made for. A window that can
   no longer show the frame once it is made (a GPU device replaced
   meanwhile, the app gone to the background) or whose swapchain then gives
   no texture declines it with the replay made (see
   RNSkWindowSurface::presentImage).
   */
  virtual ImagePresent
  presentImage(const RNSkGraphiteTargetInfo &target,
               const std::function<sk_sp<SkImage>()> &makeImage) = 0;

protected:
  /**
   Draws an image onto a canvas of the given size, for presentImage(): as it
   is when the sizes match, else stretched to the canvas, as the compositor
   shows a buffer of another size than its layer, so that a frame made for
   another size covers the target rather than leaving an edge of it empty.
   */
  static void drawOnto(SkCanvas *canvas, const sk_sp<SkImage> &image, int width,
                       int height) {
    if (image->width() == width && image->height() == height) {
      canvas->drawImage(image, 0, 0);
      return;
    }
    canvas->drawImageRect(image, SkRect::MakeIWH(width, height),
                          SkSamplingOptions(SkFilterMode::kLinear));
  }
};

} // namespace RNSkia
