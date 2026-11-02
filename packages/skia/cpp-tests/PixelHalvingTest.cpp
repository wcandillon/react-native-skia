// Host-side check of RNSkia::halvePixels, which makes the levels an Android
// image view draws smaller than its bitmap (see run.sh): a two by two box
// filter, odd sides and one-pixel sides, rounding, padded rows, and rows split
// across threads, those that cannot start included.

#include <cstdint>
#include <cstdio>
#include <functional>
#include <optional>
#include <random>
#include <thread>
#include <vector>

#include "rnskia/RNSkPixelHalving.h"

namespace {

using RNSkia::halvePixels;

int failures = 0;

void expect(bool condition, const char *what) {
  if (!condition) {
    std::fprintf(stderr, "FAIL: %s\n", what);
    failures++;
  }
}

/** Pixels of four channels whose rows are `padding` bytes longer than their
 * pixels. */
struct Pixels {
  int width;
  int height;
  size_t rowBytes;
  std::vector<uint8_t> bytes;

  Pixels(int width, int height, size_t padding = 0)
      : width(width), height(height),
        rowBytes(static_cast<size_t>(width) * 4 + padding),
        bytes(rowBytes * height) {}

  uint8_t *at(int x, int y) {
    return bytes.data() + static_cast<size_t>(y) * rowBytes +
           static_cast<size_t>(x) * 4;
  }

  /** The pixels without the rows' padding. */
  std::vector<uint8_t> packed() {
    std::vector<uint8_t> pixels;
    for (int y = 0; y < height; y++) {
      pixels.insert(pixels.end(), at(0, y), at(0, y) + width * 4);
    }
    return pixels;
  }
};

Pixels halved(Pixels &pixels, int threads, size_t halfPadding = 0) {
  Pixels half(std::max(1, pixels.width / 2), std::max(1, pixels.height / 2),
              halfPadding);
  halvePixels(pixels.bytes.data(), pixels.width, pixels.height, pixels.rowBytes,
              half.bytes.data(), half.rowBytes, threads);
  return half;
}

void fillRandomly(Pixels &pixels) {
  std::mt19937 random(425);
  for (auto &byte : pixels.bytes) {
    byte = static_cast<uint8_t>(random() & 0xff);
  }
}

void eachPixelIsTheMeanOfTheBlockItCovers() {
  Pixels pixels(4, 2);
  const uint8_t values[] = {0, 255, 10, 20, 100, 200, 30, 40};
  for (int x = 0; x < 4; x++) {
    for (int channel = 0; channel < 4; channel++) {
      pixels.at(x, 0)[channel] = values[x];
      pixels.at(x, 1)[channel] = values[4 + x];
    }
  }
  auto half = halved(pixels, 1);
  expect(half.width == 2 && half.height == 1, "a 4 x 2 image halves to 2 x 1");
  // (0 + 255 + 100 + 200 + 2) / 4 = 139, (10 + 20 + 30 + 40 + 2) / 4 = 25.
  expect(half.at(0, 0)[0] == 139 && half.at(0, 0)[3] == 139,
         "the first pixel is the rounded mean of its block, every channel");
  expect(half.at(1, 0)[1] == 25, "the second pixel is its block's mean");
}

void meansRoundToNearest() {
  Pixels pixels(2, 2);
  const uint8_t values[] = {1, 1, 1, 2};
  for (int index = 0; index < 4; index++) {
    pixels.at(index % 2, index / 2)[0] = values[index];
  }
  // 5 / 4 = 1.25 rounds to 1; 6 / 4 = 1.5 rounds up.
  expect(halved(pixels, 1).at(0, 0)[0] == 1, "1.25 rounds down");
  pixels.at(0, 0)[0] = 2;
  expect(halved(pixels, 1).at(0, 0)[0] == 2, "1.5 rounds up");
}

void anOddSideLeavesItsLastRowAndColumnOut() {
  Pixels pixels(3, 3);
  for (int y = 0; y < 3; y++) {
    for (int x = 0; x < 3; x++) {
      pixels.at(x, y)[0] = (x == 2 || y == 2) ? 255 : 0;
    }
  }
  auto half = halved(pixels, 1);
  expect(half.width == 1 && half.height == 1, "a 3 x 3 image halves to 1 x 1");
  expect(half.at(0, 0)[0] == 0,
         "the block at the corner, without the last row and column, is black");
}

void aOnePixelSideIsAveragedAlongTheOtherOnly() {
  Pixels column(1, 4);
  const uint8_t values[] = {0, 100, 200, 255};
  for (int y = 0; y < 4; y++) {
    column.at(0, y)[0] = values[y];
  }
  auto half = halved(column, 1);
  expect(half.width == 1 && half.height == 2, "a 1 x 4 column halves to 1 x 2");
  expect(half.at(0, 0)[0] == 50 && half.at(0, 1)[0] == 228,
         "each pixel of a column is the mean of the two it covers");
  Pixels row(4, 1);
  for (int x = 0; x < 4; x++) {
    row.at(x, 0)[0] = values[x];
  }
  auto halfRow = halved(row, 1);
  expect(halfRow.width == 2 && halfRow.height == 1 &&
             halfRow.at(0, 0)[0] == 50 && halfRow.at(1, 0)[0] == 228,
         "each pixel of a row is the mean of the two it covers");
  Pixels single(1, 1);
  single.at(0, 0)[2] = 77;
  expect(halved(single, 4).at(0, 0)[2] == 77, "one pixel halves to itself");
}

void theThreadsDoNotChangeTheResult() {
  Pixels pixels(1001, 777);
  fillRandomly(pixels);
  auto alone = halved(pixels, 1);
  for (int threads : {2, 3, 4, 16, 1000}) {
    expect(halved(pixels, threads).bytes == alone.bytes,
           "rows split across threads give the bytes one thread gives");
  }
}

void aBandWhoseThreadCannotStartIsHalvedOnTheCallingThread() {
  Pixels pixels(1001, 777);
  fillRandomly(pixels);
  const auto alone = halved(pixels, 1).bytes;
  int started = 0;
  // Every other thread cannot start.
  auto startEveryOther =
      [&started](std::function<void()> band) -> std::optional<std::thread> {
    if (started++ % 2 == 1) {
      return std::nullopt;
    }
    return std::thread(std::move(band));
  };
  auto noThread = [](std::function<void()>) -> std::optional<std::thread> {
    return std::nullopt;
  };
  for (int threads : {2, 4, 16}) {
    Pixels some(pixels.width / 2, pixels.height / 2);
    halvePixels(pixels.bytes.data(), pixels.width, pixels.height,
                pixels.rowBytes, some.bytes.data(), some.rowBytes, threads,
                startEveryOther);
    expect(some.bytes == alone,
           "bands whose thread did not start give the bytes one thread gives");
    Pixels none(pixels.width / 2, pixels.height / 2);
    halvePixels(pixels.bytes.data(), pixels.width, pixels.height,
                pixels.rowBytes, none.bytes.data(), none.rowBytes, threads,
                noThread);
    expect(none.bytes == alone,
           "with no thread at all, the calling thread halves every band");
  }
}

void paddedRowsAreReadAndWrittenByTheirStride() {
  Pixels packed(101, 77);
  fillRandomly(packed);
  Pixels padded(101, 77, 12);
  for (int y = 0; y < padded.height; y++) {
    std::copy(packed.at(0, y), packed.at(0, y) + packed.width * 4,
              padded.at(0, y));
  }
  const auto expected = halved(packed, 1).bytes;
  for (int threads : {1, 3}) {
    expect(halved(padded, threads, 20).packed() == expected,
           "rows padded on both sides give the bytes packed rows give");
  }
}

} // namespace

int main() {
  eachPixelIsTheMeanOfTheBlockItCovers();
  meansRoundToNearest();
  anOddSideLeavesItsLastRowAndColumnOut();
  aOnePixelSideIsAveragedAlongTheOtherOnly();
  theThreadsDoNotChangeTheResult();
  aBandWhoseThreadCannotStartIsHalvedOnTheCallingThread();
  paddedRowsAreReadAndWrittenByTheirStride();
  if (failures > 0) {
    return 1;
  }
  std::printf("PixelHalvingTest: passed\n");
  return 0;
}
