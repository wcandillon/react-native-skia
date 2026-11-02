// Host-side check of RNSkia::presentedBitmapSize, the size an image's bitmap
// is presented at, built against the Skia headers only (see run.sh). The Skia
// symbols the header references but this check never reaches are stubbed
// below.

#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <cstdlib>

#include "include/private/SkLog.h"
#include "rnskia/RNSkPresentedBitmapSize.h"

void SkLog(SkLogPriority, const char[], ...) {}
void sk_abort_no_print() { std::abort(); }

namespace {

int failures = 0;

void expect(bool condition, const char *what) {
  if (!condition) {
    std::fprintf(stderr, "FAIL: %s\n", what);
    failures++;
  }
}

// What Android draws of one bitmap (RecordingCanvas.MAX_BITMAP_SIZE).
constexpr size_t androidMaxBytes = 100 * 1024 * 1024;

int64_t bytesOf(SkISize size) { return size.area() * 4; }

void anImageWithinTheLimitKeepsItsSize() {
  const auto size = SkISize::Make(4000, 3000);
  expect(RNSkia::presentedBitmapSize(size, androidMaxBytes) == size,
         "a 48 MB image keeps its size");
  const auto atTheLimit = SkISize::Make(5120, 5120);
  expect(RNSkia::presentedBitmapSize(atTheLimit, androidMaxBytes) == atTheLimit,
         "an image of exactly the limit keeps its size");
  const auto huge = SkISize::Make(16384, 16384);
  expect(RNSkia::presentedBitmapSize(huge, SIZE_MAX) == huge,
         "no limit keeps every size");
}

void anImagePastTheLimitIsScaledDownToIt() {
  for (const auto size :
       {SkISize::Make(5121, 5121), SkISize::Make(5200, 5200),
        SkISize::Make(8160, 6120), SkISize::Make(12000, 9000),
        SkISize::Make(16384, 16384), SkISize::Make(16384, 4096),
        SkISize::Make(4096, 16384), SkISize::Make(30000, 1000)}) {
    const auto presented = RNSkia::presentedBitmapSize(size, androidMaxBytes);
    expect(bytesOf(presented) <= static_cast<int64_t>(androidMaxBytes),
           "a scaled bitmap is within the limit");
    // Some one factor takes each side to within a pixel above its own.
    const auto lowest = [](int presentedSide, int side) {
      return static_cast<double>(presentedSide) / side;
    };
    const auto highest = [](int presentedSide, int side) {
      return static_cast<double>(presentedSide + 1) / side;
    };
    expect(std::max(lowest(presented.width(), size.width()),
                    lowest(presented.height(), size.height())) <
               std::min(highest(presented.width(), size.width()),
                        highest(presented.height(), size.height())),
           "a scaled bitmap is its image scaled by one factor, rounded down");
    expect(presented.width() < size.width() &&
               presented.height() < size.height(),
           "a scaled bitmap is smaller than its image");
    const auto onePixelMore =
        SkISize::Make(presented.width() + 1, presented.height() + 1);
    expect(bytesOf(onePixelMore) > static_cast<int64_t>(androidMaxBytes),
           "a scaled bitmap is the largest within the limit");
  }
}

void aSizeTheLimitHoldsExactlyIsReachedExactly() {
  // 4:1 past the limit scales to 10240 x 2560, which is exactly the limit.
  const auto presented =
      RNSkia::presentedBitmapSize(SkISize::Make(16384, 4096), androidMaxBytes);
  expect(presented == SkISize::Make(10240, 2560),
         "a 4:1 image scales to the size the limit holds exactly");
}

void aStripOnePixelWideStaysWithinTheLimit() {
  const auto tall =
      RNSkia::presentedBitmapSize(SkISize::Make(1, 30000000), androidMaxBytes);
  expect(tall == SkISize::Make(1, 26214400),
         "a strip one pixel wide keeps the height the limit holds");
  const auto wide =
      RNSkia::presentedBitmapSize(SkISize::Make(30000000, 1), androidMaxBytes);
  expect(wide == SkISize::Make(26214400, 1),
         "a strip one pixel high keeps the width the limit holds");
}

void theSizeDependsOnItsInputsAlone() {
  const auto size = SkISize::Make(8160, 6120);
  const auto first = RNSkia::presentedBitmapSize(size, androidMaxBytes);
  const auto again = RNSkia::presentedBitmapSize(size, androidMaxBytes);
  expect(first == again, "the same image gets the same size every time");
  expect(RNSkia::presentedBitmapSize(first, androidMaxBytes) == first,
         "a presented size is presented as it is");
}

} // namespace

int main() {
  anImageWithinTheLimitKeepsItsSize();
  anImagePastTheLimitIsScaledDownToIt();
  aSizeTheLimitHoldsExactlyIsReachedExactly();
  aStripOnePixelWideStaysWithinTheLimit();
  theSizeDependsOnItsInputsAlone();
  if (failures > 0) {
    return 1;
  }
  std::printf("PresentedBitmapSizeTest: passed\n");
  return 0;
}
