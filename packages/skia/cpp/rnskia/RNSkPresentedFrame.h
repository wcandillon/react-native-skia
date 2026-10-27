#pragma once

#include <cstdint>
#include <functional>
#include <memory>
#include <mutex>
#include <utility>

#include "RNSkPlatformContext.h"
#include "RNSkPresentedImages.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkImage.h"

#pragma clang diagnostic pop

namespace RNSkia {

/**
 The frame a static canvas shows (see RNSkView::presentAsImages): kept
 presentable in RNSkPresentedImages while the view shows it, and given back
 once the next frame replaces it, so the view keeps the previous frame until
 the next one's pixels arrive. The platform view is told which image to show,
 by its id, from the worker that presents the frames; it closes this when it
 goes away, and a frame presented after that is given back unseen.
 */
class RNSkPresentedFrame {
public:
  /** Tells the platform view the image to show. Called on the worker. */
  using Show = std::function<void(uint32_t imageId)>;

  RNSkPresentedFrame(std::shared_ptr<RNSkPlatformContext> context, Show show)
      : _context(std::move(context)), _show(std::move(show)) {}

  ~RNSkPresentedFrame() { close(); }

  RNSkPresentedFrame(const RNSkPresentedFrame &) = delete;
  RNSkPresentedFrame &operator=(const RNSkPresentedFrame &) = delete;

  /** A new frame to show. Worker. */
  void present(const sk_sp<SkImage> &frame) {
    std::lock_guard<std::mutex> lock(_mutex);
    if (_closed) {
      return;
    }
    auto &images = RNSkPresentedImages::getInstance();
    const auto id = RNSkPresentedImages::idOf(frame);
    images.retain(this, frame, _context);
    _show(id);
    if (_shownId != 0 && _shownId != id) {
      images.release(this, _shownId, _context);
    }
    _shownId = id;
  }

  /** The view went away: every frame it holds is given back. Any thread. */
  void close() {
    std::lock_guard<std::mutex> lock(_mutex);
    if (_closed) {
      return;
    }
    _closed = true;
    _show = nullptr;
    _shownId = 0;
    RNSkPresentedImages::getInstance().releaseAll(this, _context);
  }

private:
  std::mutex _mutex;
  std::shared_ptr<RNSkPlatformContext> _context;
  Show _show;
  bool _closed = false;
  uint32_t _shownId = 0;
};

} // namespace RNSkia
