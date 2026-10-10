#pragma once

#include <vector>

#include "RNSkGraphiteTargetInfo.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkImage.h"
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
   it. Called on the thread that owns the surface. Returns false when the
   surface cannot present right now (there is none, or the app is in the
   background). insertAttempted distinguishes an unavailable surface from
   an insertion failure; ordered recordings cannot be retried after an attempt.
   */
  virtual bool presentRecordings(
      const std::vector<skgpu::graphite::Recording *> &recordings,
      bool *insertAttempted = nullptr) = 0;

  /**
   Draws an image at the origin of the target texture and presents it. Same
   thread and return value as presentRecordings(). Used for a recording whose
   size or color space differs from the target's: it is replayed into a
   texture of its own first (see RNSkView::present).
   */
  virtual bool presentImage(const sk_sp<SkImage> &image) = 0;
};

} // namespace RNSkia
