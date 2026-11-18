// Host-side check of RNSkia::halvePixels, which makes the levels an Android
// image view draws smaller than its bitmap (see run.sh): a two by two box
// filter, odd sides and one-pixel sides, rounding, padded rows, and rows split
// across threads, those that cannot start for want of threads or of memory
// included.

#include <algorithm>
#include <atomic>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <new>
#include <optional>
#include <random>
#include <thread>
#include <vector>

#include <sys/resource.h>
#include <sys/wait.h>
#include <unistd.h>

#include "rnskia/RNSkPixelHalving.h"

namespace {

// While set, every allocation of this process fails, as one does where the
// system has no memory left.
std::atomic<bool> allocationsFail{false};

} // namespace

void *operator new(std::size_t size) {
  if (!allocationsFail.load()) {
    if (void *memory = std::malloc(size == 0 ? 1 : size)) {
      return memory;
    }
  }
  throw std::bad_alloc();
}

void operator delete(void *memory) noexcept { std::free(memory); }

void operator delete(void *memory, std::size_t) noexcept { std::free(memory); }

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

// In a child process held to no more threads, no band's thread starts: the
// calling thread halves every band. Where the limit does not hold (root, or a
// capability that lifts it), the case says it went unchecked.
void aBandWhoseThreadCannotStartIsHalvedOnTheCallingThread() {
  Pixels pixels(1001, 777);
  fillRandomly(pixels);
  const auto alone = halved(pixels, 1).bytes;
  const pid_t child = fork();
  if (child == -1) {
    expect(false, "a child process to hold to no more threads is made");
    return;
  }
  if (child == 0) {
    const rlimit noMoreThreads{0, 0};
    setrlimit(RLIMIT_NPROC, &noMoreThreads);
    if (auto probe = RNSkia::startBandThread([]() {})) {
      probe->join();
      std::printf("PixelHalvingTest: the thread limit does not hold here, so "
                  "the fallback went unchecked\n");
      _exit(0);
    }
    _exit(halved(pixels, 16).bytes == alone ? 0 : 1);
  }
  int status = 0;
  const bool waited = waitpid(child, &status, 0) == child;
  expect(waited && WIFEXITED(status) && WEXITSTATUS(status) == 0,
         "with no thread to start, the calling thread halves every band");
}

void aBandThreadWithNoMemoryToStartIsNotStarted() {
  allocationsFail = true;
  auto band = RNSkia::startBandThread([]() {});
  allocationsFail = false;
  expect(!band.has_value(),
         "a band thread with no memory to start answers nothing");
  if (band) {
    band->join();
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

// A level halved a few rows at a time, as a shown one is on Android, equals
// the level halved whole: each half row reads only its two rows.
void halvingInBandsOfRowsEqualsHalvingWhole() {
  for (const auto &[width, height] :
       {std::pair{37, 29}, std::pair{64, 128}, std::pair{5, 1}}) {
    Pixels pixels(width, height);
    fillRandomly(pixels);
    auto whole = halved(pixels, 1);
    Pixels banded(whole.width, whole.height);
    constexpr int kHalfRowsPerBand = 3;
    for (int halfRow = 0; halfRow < banded.height;
         halfRow += kHalfRowsPerBand) {
      const int halfRows = std::min(kHalfRowsPerBand, banded.height - halfRow);
      halvePixels(pixels.at(0, 2 * halfRow), width,
                  height == 1 ? 1 : 2 * halfRows, pixels.rowBytes,
                  banded.at(0, halfRow), banded.rowBytes, 2);
    }
    expect(banded.bytes == whole.bytes,
           "halving in bands of rows equals halving whole");
  }
}

int main() {
  halvingInBandsOfRowsEqualsHalvingWhole();
  // A band thread that never ends fails the run instead of hanging it.
  alarm(30);
  eachPixelIsTheMeanOfTheBlockItCovers();
  meansRoundToNearest();
  anOddSideLeavesItsLastRowAndColumnOut();
  aOnePixelSideIsAveragedAlongTheOtherOnly();
  theThreadsDoNotChangeTheResult();
  aBandWhoseThreadCannotStartIsHalvedOnTheCallingThread();
  aBandThreadWithNoMemoryToStartIsNotStarted();
  paddedRowsAreReadAndWrittenByTheirStride();
  if (failures > 0) {
    return 1;
  }
  std::printf("PixelHalvingTest: passed\n");
  return 0;
}
