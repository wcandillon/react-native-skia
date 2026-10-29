#pragma once

#include <cstdint>
#include <memory>
#include <mutex>
#include <optional>
#include <utility>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkColorSpace.h"
#include "include/core/SkImage.h"
#include "include/core/SkImageInfo.h"
#include "include/core/SkPixmap.h"
#include "include/core/SkSamplingOptions.h"

#pragma clang diagnostic pop

#include "RNDawnContext.h"
#include "RNSkPlatformContext.h"
#include "RNSkPresentedBitmapSize.h"
#include "RNSkPresentedImageLedger.h"
#include "RNSkWorker.h"
#include "utils/RNSkLog.h"

namespace RNSkia {

/**
 The images a <SkiaImageView> or a static canvas shows. An image is read back
 to the CPU once, however many views show it, and handed to the platform as one
 bitmap that every view showing it draws inside the window's own drawing: no
 view has a surface or a swapchain of its own.

 An image is retained while a view shows it and released after (see
 SkiaImageView.tsx and RNSkPresentedFrame); the platform forgets the bitmap
 once the last retain is released. A view shows an image by its id, the
 image's own unique id, so every view of one image shares one bitmap. Retains
 are counted per owner, the view API of the runtime that made them or the
 frame sink of a static canvas, so a runtime torn down after its successor
 started (a reload) gives back its own retains and no others.

 Threading: retain and release run on the caller's thread: the JS runtime of
 a <SkiaImageView>, or the worker and the main thread for a static canvas; a
 readback completes on whichever thread finishes the GPU work. The registry
 hands the platform its present and discard requests under its own lock, so
 they reach the main thread in the order the retains and releases happened: a
 release always overtakes a readback still in flight for the same retain.
 */
class RNSkPresentedImages {
public:
  static RNSkPresentedImages &getInstance() {
    // Never destroyed, like RNSkWorker: the worker and the poller may
    // still use it while the process exits.
    static auto *instance = new RNSkPresentedImages();
    return *instance;
  }

  RNSkPresentedImages(const RNSkPresentedImages &) = delete;
  RNSkPresentedImages &operator=(const RNSkPresentedImages &) = delete;

  /** The id a view shows `image` by. */
  static uint32_t idOf(const sk_sp<SkImage> &image) {
    return image->uniqueID();
  }

  /**
   Keeps `image` presentable until the matching release. The first retain of
   an image reads it back and presents it; later ones only count.
   */
  void retain(const void *owner, const sk_sp<SkImage> &image,
              const std::shared_ptr<RNSkPlatformContext> &context) {
    auto id = idOf(image);
    std::optional<uint64_t> readback;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      readback = _ledger.retain(owner, id);
    }
    if (!readback.has_value()) {
      return;
    }
    const uint64_t generation = *readback;
    // The readback is requested from the worker, so that the caller only
    // counts.
    std::weak_ptr<RNSkPlatformContext> weakContext = context;
    RNSkWorker::getInstance().post(
        [this, id, generation, image, weakContext]() {
          produce(id, generation, image, weakContext);
        });
  }

  /** Gives back a retain. The last one discards the image's bitmap. */
  void release(const void *owner, uint32_t id,
               const std::shared_ptr<RNSkPlatformContext> &context) {
    std::lock_guard<std::mutex> lock(_mutex);
    if (_ledger.release(owner, id)) {
      context->discardPresentedBitmap(id);
    }
  }

  /**
   Gives back every retain `owner` holds: its runtime is gone, and none of
   them will be released.
   */
  void releaseAll(const void *owner,
                  const std::shared_ptr<RNSkPlatformContext> &context) {
    std::lock_guard<std::mutex> lock(_mutex);
    for (auto id : _ledger.releaseAll(owner)) {
      context->discardPresentedBitmap(id);
    }
  }

private:
  RNSkPresentedImages() = default;

  // Premultiplied 8-bit RGBA, what an Android ARGB_8888 bitmap and a CGImage
  // both take as they are: in Display P3 where the platform renders in it
  // (see RNSkPlatformContext::prefersP3ColorSpace) and the image has colors
  // outside sRGB to keep, as a canvas's frame there does; in sRGB otherwise.
  // At most as large as the platform draws (see presentedBitmapSize).
  static SkImageInfo
  presentedInfo(const sk_sp<SkImage> &image,
                const std::shared_ptr<RNSkPlatformContext> &context) {
    auto colorSpace = SkColorSpace::MakeSRGB();
    auto *imageColorSpace = image->colorSpace();
    if (context->prefersP3ColorSpace() && imageColorSpace != nullptr &&
        !imageColorSpace->isSRGB()) {
      colorSpace = DawnUtils::viewColorSpace(/* useP3ColorSpace= */ true);
    }
    return SkImageInfo::Make(
        presentedBitmapSize(image->dimensions(),
                            context->getMaxPresentedBitmapBytes()),
        kRGBA_8888_SkColorType, kPremul_SkAlphaType, std::move(colorSpace));
  }

  // Runs on the worker, where the platform's bitmap is made and finished: a
  // readback completes inside the GPU context's lock, where that work would
  // hold up every view's frame. A CPU image is scaled into the bitmap. A
  // readback's mapped memory goes with the GPU device that made it, which a
  // loss may destroy as soon as the readback's callback returns (see
  // DawnContext::recover), so its rows are copied into the bitmap in the
  // callback, the one thing done there.
  void produce(uint32_t id, uint64_t generation, const sk_sp<SkImage> &image,
               const std::weak_ptr<RNSkPlatformContext> &weakContext) {
    auto context = weakContext.lock();
    if (context == nullptr || !isCurrent(id, generation)) {
      return;
    }
    const auto info = presentedInfo(image, context);
    auto *dawnContext = DawnContext::tryGetInstance();
    // A texture is read back through the current GPU device: with none, or
    // a lost one, nothing is read, so no bitmap is made for it.
    if (image->isTextureBacked() &&
        (dawnContext == nullptr || DawnContext::isDeviceLost())) {
      RNSkLogger::logToConsole(
          "SkiaImageView: could not read a %dx%d image back from the GPU",
          info.width(), info.height());
      return;
    }
    std::shared_ptr<PresentedBitmapWriter> writer =
        context->makePresentedBitmap(info);
    if (writer == nullptr) {
      RNSkLogger::logToConsole(
          "SkiaImageView: the platform made no bitmap of %dx%d pixels",
          info.width(), info.height());
      return;
    }
    if (!image->isTextureBacked()) {
      // Mipmapped, as the GPU's repeated halving is for a texture.
      if (!image->scalePixels(writer->getPixels(),
                              SkSamplingOptions(SkFilterMode::kLinear,
                                                SkMipmapMode::kLinear))) {
        RNSkLogger::logToConsole(
            "SkiaImageView: could not scale a %dx%d image into its bitmap",
            image->width(), image->height());
        return;
      }
      finishAndPresent(id, generation, *writer);
      return;
    }
    dawnContext->readPixels(
        image, image->bounds(), info,
        [this, id, generation,
         writer = std::move(writer)](ReadResult result) mutable {
          const bool written = result != nullptr &&
                               SkPixmap(writer->getPixels().info(),
                                        result->data(0), result->rowBytes(0))
                                   .readPixels(writer->getPixels());
          if (!written) {
            RNSkLogger::logToConsole(
                "SkiaImageView: could not read a %dx%d image back from the GPU",
                writer->getPixels().width(), writer->getPixels().height());
          }
          // The platform's calls that finish the bitmap, or free it, run on
          // the worker, outside the GPU context's lock.
          RNSkWorker::getInstance().post(
              [this, id, generation, written, writer = std::move(writer)]() {
                if (written) {
                  finishAndPresent(id, generation, *writer);
                }
              });
        });
  }

  void finishAndPresent(uint32_t id, uint64_t generation,
                        PresentedBitmapWriter &writer) {
    // An image released while it was read back gets no bitmap.
    if (!isCurrent(id, generation)) {
      return;
    }
    auto bitmap = writer.finish();
    if (bitmap == nullptr) {
      RNSkLogger::logToConsole(
          "SkiaImageView: the platform made no bitmap of %dx%d pixels",
          writer.getPixels().width(), writer.getPixels().height());
      return;
    }
    std::lock_guard<std::mutex> lock(_mutex);
    if (_ledger.isCurrent(id, generation)) {
      bitmap->present(id);
    }
  }

  bool isCurrent(uint32_t id, uint64_t generation) {
    std::lock_guard<std::mutex> lock(_mutex);
    return _ledger.isCurrent(id, generation);
  }

  std::mutex _mutex;
  RNSkPresentedImageLedger _ledger;
};

} // namespace RNSkia
