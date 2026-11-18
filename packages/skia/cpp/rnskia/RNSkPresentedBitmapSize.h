#pragma once

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <limits>

#include "include/core/SkSize.h"

namespace RNSkia {

/**
 The size of the bitmap an image of `size` is presented as (see
 RNSkPresentedImages): its own, scaled down where a side is longer than
 `maxSide`, the largest texture the GPU makes, and again where its pixels of
 4 bytes hold more than `maxBytes`, each side rounded down.
 */
inline SkISize
presentedBitmapSize(SkISize size, size_t maxBytes,
                    int maxSide = std::numeric_limits<int>::max()) {
  const int64_t longest = std::max(size.width(), size.height());
  if (longest > maxSide) {
    // A side scaled below one pixel keeps one.
    size = SkISize::Make(
        std::max<int>(
            1, static_cast<int>(size.width() * int64_t{maxSide} / longest)),
        std::max<int>(
            1, static_cast<int>(size.height() * int64_t{maxSide} / longest)));
  }
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
