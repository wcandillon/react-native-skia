#pragma once

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>

#include "include/core/SkSize.h"

namespace RNSkia {

/**
 The size of the bitmap an image of `size` is presented as (see
 RNSkPresentedImages): its own, or, where its pixels of 4 bytes hold more than
 `maxBytes`, its size scaled down to `maxBytes`, each side rounded down.
 */
inline SkISize presentedBitmapSize(SkISize size, size_t maxBytes) {
  const auto maxPixels = static_cast<int64_t>(maxBytes / 4);
  if (size.area() <= maxPixels) {
    return size;
  }
  const double scale = std::sqrt(static_cast<double>(maxPixels) /
                                 static_cast<double>(size.area()));
  const int width = static_cast<int>(size.width() * scale);
  const int height = static_cast<int>(size.height() * scale);
  // A side scaled below one pixel keeps one, and the other the pixels left.
  if (width == 0) {
    return SkISize::Make(
        1, static_cast<int>(std::min<int64_t>(size.height(), maxPixels)));
  }
  if (height == 0) {
    return SkISize::Make(
        static_cast<int>(std::min<int64_t>(size.width(), maxPixels)), 1);
  }
  return SkISize::Make(width, height);
}

} // namespace RNSkia
