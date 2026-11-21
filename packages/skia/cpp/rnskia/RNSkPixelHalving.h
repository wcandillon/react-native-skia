#pragma once

#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <new>
#include <optional>
#include <system_error>
#include <thread>
#include <utility>
#include <vector>

namespace RNSkia {

/**
 * Starts `band` on a thread of its own, or answers nothing when no thread can
 * be started: the system is out of threads, or of memory for one.
 */
template <typename Band>
std::optional<std::thread> startBandThread(Band &&band) {
  try {
    return std::thread(std::forward<Band>(band));
  } catch (const std::system_error &) {
    return std::nullopt;
  } catch (const std::bad_alloc &) {
    return std::nullopt;
  }
}

/**
 * Halves premultiplied pixels of four 8-bit channels: each pixel of `half`,
 * floor(width / 2) by floor(height / 2) and at least one, is the mean of the
 * two by two block of `pixels` it covers, rounded to nearest, which is the box
 * filter a mipmap level is made with. An odd side's last row or column is left
 * out; a side of one pixel is averaged along the other side only. The rows of
 * `half` are split across at most `threads` bands, each writing rows of its
 * own, so the result does not depend on how many run; a band whose thread
 * cannot start (see startBandThread) is halved on the calling thread.
 */
inline void halvePixels(const uint8_t *pixels, int width, int height,
                        size_t rowBytes, uint8_t *half, size_t halfRowBytes,
                        int threads) {
  const int halfWidth = std::max(1, width / 2);
  const int halfHeight = std::max(1, height / 2);
  const size_t right = width > 1 ? 4 : 0;
  const size_t below = height > 1 ? rowBytes : 0;
  auto halveRows = [=](int firstRow, int endRow) {
    for (int y = firstRow; y < endRow; y++) {
      const uint8_t *top = pixels + static_cast<size_t>(2 * y) * rowBytes;
      const uint8_t *bottom = top + below;
      uint8_t *out = half + static_cast<size_t>(y) * halfRowBytes;
      for (int x = 0; x < halfWidth; x++) {
        const size_t left = static_cast<size_t>(8) * x;
        for (int channel = 0; channel < 4; channel++) {
          const unsigned sum =
              top[left + channel] + top[left + right + channel] +
              bottom[left + channel] + bottom[left + right + channel];
          out[4 * x + channel] = static_cast<uint8_t>((sum + 2) >> 2);
        }
      }
    }
  };
  const int bands = std::clamp(threads, 1, halfHeight);
  auto halveBand = [=](int band) {
    halveRows(band * halfHeight / bands, (band + 1) * halfHeight / bands);
  };
  std::vector<std::thread> workers;
  workers.reserve(bands - 1);
  std::vector<int> callerBands;
  callerBands.reserve(bands);
  callerBands.push_back(0);
  for (int band = 1; band < bands; band++) {
    auto worker = startBandThread([=]() { halveBand(band); });
    if (worker) {
      workers.push_back(std::move(*worker));
    } else {
      callerBands.push_back(band);
    }
  }
  for (int band : callerBands) {
    halveBand(band);
  }
  for (auto &worker : workers) {
    worker.join();
  }
}

} // namespace RNSkia
