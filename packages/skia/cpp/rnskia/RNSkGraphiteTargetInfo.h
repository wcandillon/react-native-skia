#pragma once

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkColorType.h"
#include "include/gpu/graphite/TextureInfo.h"

#pragma clang diagnostic pop

namespace RNSkia {

/**
 * Describes the texture a recording is replayed onto: the pixel size, the
 * format and the color space of a window (or offscreen) surface. A deferred
 * canvas is recorded against this description, so it can be created before
 * the surface itself exists.
 */
struct RNSkGraphiteTargetInfo {
  int width = 0;
  int height = 0;
  SkColorType colorType = kUnknown_SkColorType;
  // Display P3 rather than sRGB (see DawnUtils::viewColorSpace). The colors
  // of a recording are converted to the color space of its target when it is
  // recorded, not when it is replayed.
  bool useP3ColorSpace = false;
  skgpu::graphite::TextureInfo textureInfo;
};

} // namespace RNSkia
