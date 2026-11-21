#pragma once

#include <algorithm>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <map>
#include <memory>
#include <mutex>
#include <optional>
#include <type_traits>
#include <utility>
#include <variant>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkBitmap.h"
#include "include/core/SkBlendMode.h"
#include "include/core/SkCanvas.h"
#include "include/core/SkColorSpace.h"
#include "include/core/SkImage.h"
#include "include/core/SkImageInfo.h"
#include "include/core/SkPaint.h"
#include "include/core/SkPixmap.h"
#include "include/core/SkRect.h"
#include "include/core/SkSamplingOptions.h"
#include "include/gpu/graphite/Image.h"

#pragma clang diagnostic pop

#include "RNDawnContext.h"
#include "RNSkCompletion.h"
#include "RNSkDrawingWait.h"
#include "RNSkPlatformContext.h"
#include "RNSkPresentThread.h"
#include "RNSkPresentedBitmapSize.h"
#include "RNSkPresentedImageLedger.h"
#include "RNSkWorker.h"
#include "utils/RNSkLog.h"

namespace RNSkia {

/**
 The images <SkiaImageView>s show, each drawn once into a bitmap of the
 platform's that every view of it draws. Retains are counted per owner, the
 view API of the runtime that made them, so a runtime torn down after a reload
 gives back only its own. Presents, failures and discards reach the platform
 in the order of the retains and releases that caused them.
 */
class RNSkPresentedImages {
public:
  static RNSkPresentedImages &getInstance() {
    // Never destroyed: the worker may still use it while the process exits.
    static auto *instance = new RNSkPresentedImages();
    return *instance;
  }

  RNSkPresentedImages(const RNSkPresentedImages &) = delete;
  RNSkPresentedImages &operator=(const RNSkPresentedImages &) = delete;

  // A thread of their own, so that the encodes and decodes on the shared
  // worker hold up none of them.
  static RNSkWorker &worker() {
    static auto &instance = []() -> RNSkWorker & {
      auto &made =
          RNSkWorker::makeDedicated("RNSkia Bitmaps", &freeThreadRecorders);
#if defined(__ANDROID__)
      // It calls into Java for every image and lets go of Java references.
      made.post(attachPresentThread);
#endif
      return made;
    }();
    return instance;
  }

  /** The id a view shows `image` by. */
  static uint32_t idOf(const sk_sp<SkImage> &image) {
    return image->uniqueID();
  }

  /**
   The first retain of an image, and the first after its drawing failed,
   draws it; a retain whose drawing cannot be requested is given back before
   it throws.
   */
  void retain(const void *owner, const sk_sp<SkImage> &image,
              const std::shared_ptr<RNSkPlatformContext> &context) {
    auto id = idOf(image);
    // Started before the retain counts: a thread that cannot start throws
    // with nothing counted.
    auto &images = worker();
    std::optional<uint64_t> drawing;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      drawing = _ledger.retain(owner, id);
      if (drawing.has_value()) {
        _failed.erase(id);
      }
    }
    if (!drawing.has_value()) {
      return;
    }
    const uint64_t generation = *drawing;
    std::weak_ptr<RNSkPlatformContext> weakContext = context;
    try {
      images.post([this, id, generation, image, weakContext]() {
        produce(id, generation, image, weakContext);
      });
    } catch (...) {
      abandon(owner, id, generation, *context);
      throw;
    }
  }

  /** The last release of an image discards its bitmap. */
  void release(const void *owner, uint32_t id,
               const std::shared_ptr<RNSkPlatformContext> &context) {
    std::lock_guard<std::mutex> lock(_mutex);
    if (_ledger.release(owner, id)) {
      discard(id, *context);
    }
  }

  /** Gives back every retain of an owner whose runtime is gone. */
  void releaseAll(const void *owner,
                  const std::shared_ptr<RNSkPlatformContext> &context) {
    std::lock_guard<std::mutex> lock(_mutex);
    for (auto id : _ledger.releaseAll(owner)) {
      discard(id, *context);
    }
  }

  /**
   Draws the pixels `importSource` imports halved into `half` on the GPU, each
   pixel the mean of the 2x2 block it covers, as halvePixels does: whether
   `half` holds them. Never on the main thread or a JS thread.
   */
  static bool drawHalf(const DawnContext::SharedTextureImport &importSource,
                       SkISize sourceSize, PresentedBuffer &half) {
    const auto halfSize = half.getInfo().dimensions();
    const auto blocks =
        SkRect::MakeWH(sourceSize.width() > 1 ? 2 * halfSize.width() : 1,
                       sourceSize.height() > 1 ? 2 * halfSize.height() : 1);
    auto *dawnContext = DawnContext::tryGetInstance();
    bool drawn = false;
    try {
      drawn = dawnContext != nullptr && !DawnContext::isDeviceLost() &&
              drawBuffer(
                  half, *dawnContext,
                  [&](SkCanvas *canvas, const sk_sp<SkImage> &source) {
                    SkPaint paint;
                    paint.setBlendMode(SkBlendMode::kSrc);
                    canvas->drawImageRect(
                        source, blocks, SkRect::Make(halfSize),
                        SkSamplingOptions(SkFilterMode::kLinear), &paint,
                        SkCanvas::kStrict_SrcRectConstraint);
                  },
                  importSource);
    } catch (const std::exception &error) {
      RNSkLogger::logToConsole("SkiaImageView: %s", error.what());
    }
    freeThreadRecorders();
    return drawn;
  }

private:
  // Never removed: the instance is never destroyed (see getInstance).
  RNSkPresentedImages() {
    DawnContext::addLossListener(
        [this](const DawnContext::LossInfo &) { drawFailedAgain(); });
  }

  // The slices a drawing is waited for in (see waitForDrawing).
  static constexpr std::chrono::milliseconds kDrawingSlice{50};

  // Whether the GPU work `waitFor` answers about, run on the device of
  // `generation`, is done (see waitForDrawing).
  template <typename WaitFor>
  static bool waitForGpu(WaitFor &&waitFor, uint64_t generation) {
    return waitForDrawing(
        std::forward<WaitFor>(waitFor),
        [generation]() { return DawnContext::isCurrent(generation); },
        kDrawingSlice);
  }

  // What the images' worker and the levels jobs drew is drawn once.
  static void freeThreadRecorders() {
    DawnContext::trimThreadRecorders(std::chrono::milliseconds(0),
                                     /* everything= */ true);
  }

  // Premultiplied 8-bit color, in Display P3 where the platform's views can
  // show it and the image has colors outside sRGB, in sRGB otherwise, and no
  // larger than the platform draws or the GPU makes a texture.
  static SkImageInfo presentedInfo(const sk_sp<SkImage> &image,
                                   RNSkPlatformContext &context, int maxSide) {
    auto colorSpace = SkColorSpace::MakeSRGB();
    auto *imageColorSpace = image->colorSpace();
    if (context.canPresentP3Bitmaps() && imageColorSpace != nullptr &&
        !imageColorSpace->isSRGB()) {
      colorSpace = DawnUtils::viewColorSpace(/* useP3ColorSpace= */ true);
    }
    return SkImageInfo::Make(
        presentedBitmapSize(image->dimensions(),
                            context.getMaxPresentedBitmapBytes(), maxSide),
        kRGBA_8888_SkColorType, kPremul_SkAlphaType, std::move(colorSpace));
  }

  static int maxTextureSide(DawnContext &dawnContext) {
    const auto side = dawnContext.getMaxTextureDimension2D();
    return side == 0 ||
                   side > static_cast<uint32_t>(std::numeric_limits<int>::max())
               ? std::numeric_limits<int>::max()
               : static_cast<int>(side);
  }

  // A CPU image with a side longer than the largest texture cannot be
  // uploaded whole: it is scaled to `info` on the CPU first.
  static sk_sp<SkImage> textureSized(const sk_sp<SkImage> &image,
                                     const SkImageInfo &info, int maxSide) {
    if (image->isTextureBacked() ||
        (image->width() <= maxSide && image->height() <= maxSide)) {
      return image;
    }
    SkBitmap bitmap;
    if (!bitmap.tryAllocPixels(info) ||
        !image->scalePixels(
            bitmap.pixmap(),
            SkSamplingOptions(SkFilterMode::kLinear, SkMipmapMode::kLinear))) {
      return nullptr;
    }
    bitmap.setImmutable();
    return bitmap.asImage();
  }

  // Drawn at half its size or less on a side: smoothed by mipmaps, as a
  // texture's would smooth it.
  static bool isMinified(const sk_sp<SkImage> &image, SkISize size) {
    return int64_t{size.width()} * 2 <= image->width() ||
           int64_t{size.height()} * 2 <= image->height();
  }

  static void drawScaled(SkCanvas *canvas, const sk_sp<SkImage> &texture,
                         SkISize size, bool minified) {
    SkPaint paint;
    paint.setBlendMode(SkBlendMode::kSrc);
    if (texture->dimensions() == size) {
      canvas->drawImage(texture, 0, 0, SkSamplingOptions(), &paint);
      return;
    }
    canvas->drawImageRect(texture, SkRect::Make(size),
                          SkSamplingOptions(SkFilterMode::kLinear,
                                            minified ? SkMipmapMode::kLinear
                                                     : SkMipmapMode::kNone),
                          &paint);
  }

  // Waited for holding no lock: once the GPU is done the buffer is the
  // platform's alone, and no device loss reaches it.
  template <typename Draw>
  static bool
  drawBuffer(PresentedBuffer &buffer, DawnContext &dawnContext, Draw &&draw,
             const DawnContext::SharedTextureImport &importSource = nullptr) {
    auto fences = dawnContext.drawIntoSharedTexture(
        [&buffer](const wgpu::Device &device) { return buffer.import(device); },
        buffer.getInfo().refColorSpace(), std::forward<Draw>(draw),
        importSource);
    if (!fences.has_value()) {
      return false;
    }
    auto drawing = buffer.drawingOf(fences->fences, fences->signaledValues);
    return drawing != nullptr && waitForGpu(
                                     [&](std::chrono::milliseconds slice) {
                                       return drawing->waitFor(slice);
                                     },
                                     fences->generation);
  }

  // A CPU image is scaled on the CPU; a GPU image is read back, and the
  // readback copied inside its callback, under the GPU context's lock, which
  // a device's destruction takes too.
  static std::shared_ptr<PresentedBitmap>
  readBackInto(std::shared_ptr<PresentedPixels> pixels,
               const sk_sp<SkImage> &image, DawnContext &dawnContext) {
    if (!image->isTextureBacked()) {
      return image->scalePixels(pixels->getPixels(),
                                SkSamplingOptions(SkFilterMode::kLinear,
                                                  SkMipmapMode::kLinear))
                 ? pixels->finish()
                 : nullptr;
    }
    const auto generation = DawnContext::generation();
    auto copied = std::make_shared<RNSkCompletion>();
    dawnContext.readPixels(image, image->bounds(), pixels->getPixels().info(),
                           [pixels, copied](ReadResult rows) {
                             const auto &written = pixels->getPixels();
                             copied->complete(rows != nullptr &&
                                              SkPixmap(written.info(),
                                                       rows->data(0),
                                                       rows->rowBytes(0))
                                                  .readPixels(written));
                           });
    std::optional<bool> result;
    const bool done = waitForGpu(
        [&](std::chrono::milliseconds slice) {
          result = copied->waitFor(slice);
          return result.has_value();
        },
        generation);
    return done && *result ? pixels->finish() : nullptr;
  }

  static std::shared_ptr<PresentedBitmap> drawInto(PresentedTarget target,
                                                   const sk_sp<SkImage> &image,
                                                   DawnContext &dawnContext,
                                                   int maxSide) {
    return std::visit(
        [&](auto &made) -> std::shared_ptr<PresentedBitmap> {
          using Made = std::decay_t<decltype(made)>;
          if constexpr (std::is_same_v<Made, Owned<PresentedBuffer>>) {
            const auto &info = made->getInfo();
            auto source = textureSized(image, info, maxSide);
            if (source == nullptr) {
              return nullptr;
            }
            const bool minified = isMinified(source, info.dimensions());
            // A CPU image is uploaded as a texture of its own, which the
            // worker frees once idle, rather than through the image cache the
            // frames share.
            auto texture = dawnContext.MakeTextureImage(source, minified);
            const bool drawn =
                texture != nullptr &&
                drawBuffer(*made, dawnContext,
                           [&](SkCanvas *canvas, const sk_sp<SkImage> &) {
                             drawScaled(canvas, texture, info.dimensions(),
                                        minified);
                           });
            return drawn ? made->finish() : nullptr;
          } else {
            static_assert(std::is_same_v<Made, Owned<PresentedPixels>>);
            return readBackInto(std::move(made).share(), image, dawnContext);
          }
        },
        target);
  }

  // `image` as a bitmap of the platform's; nullptr when it could not be
  // drawn, the device lost among the reasons. Never on the main thread or a
  // JS thread.
  static std::shared_ptr<PresentedBitmap>
  drawForViews(const sk_sp<SkImage> &image, RNSkPlatformContext &context) {
    auto *dawnContext = DawnContext::tryGetInstance();
    if (dawnContext == nullptr ||
        (DawnContext::isDeviceLost() &&
         (image->isTextureBacked() || context.makesPresentedBuffers()))) {
      return nullptr;
    }
    std::shared_ptr<PresentedBitmap> bitmap;
    try {
      const auto maxSide = maxTextureSide(*dawnContext);
      auto target =
          context.makePresentedTarget(presentedInfo(image, context, maxSide));
      if (target.has_value()) {
        bitmap = drawInto(std::move(*target), image, *dawnContext, maxSide);
      }
    } catch (const std::exception &error) {
      RNSkLogger::logToConsole("SkiaImageView: %s", error.what());
    }
    return bitmap;
  }

  // Runs on the images' worker.
  void produce(uint32_t id, uint64_t generation, const sk_sp<SkImage> &image,
               const std::weak_ptr<RNSkPlatformContext> &weakContext) {
    auto context = weakContext.lock();
    if (context == nullptr || !isCurrent(id, generation)) {
      return;
    }
    const auto device = DawnContext::generation();
    auto bitmap = drawForViews(image, *context);
    if (bitmap == nullptr) {
      RNSkLogger::logToConsole(
          "SkiaImageView: could not draw a %dx%d image for the platform",
          image->width(), image->height());
      presentFailure(id, generation, image, context, device);
      return;
    }
    // An image released while it was drawn gets no bitmap.
    std::lock_guard<std::mutex> lock(_mutex);
    if (_ledger.isCurrent(id, generation)) {
      bitmap->present(id);
    }
  }

  // The views of an image no bitmap could be made for, on the device of
  // `device`, show nothing, unless it was released meanwhile. The next retain
  // draws it again, and so does a device's replacement for a CPU image: a GPU
  // image's texture goes with its device.
  void presentFailure(uint32_t id, uint64_t generation,
                      const sk_sp<SkImage> &image,
                      const std::shared_ptr<RNSkPlatformContext> &context,
                      uint64_t device) {
    std::lock_guard<std::mutex> lock(_mutex);
    if (!_ledger.fail(id, generation)) {
      return;
    }
    context->presentFailure(id);
    if (image->isTextureBacked()) {
      return;
    }
    _failed.insert_or_assign(id, Failed{image, context});
    // Replaced since the drawing began, its listener ran before the failure.
    if (DawnContext::generation() != device) {
      drawFailedAgainLocked();
    }
  }

  // Once a replacement of a lost device is in place: every CPU image whose
  // drawing failed is drawn again on it.
  void drawFailedAgain() {
    std::lock_guard<std::mutex> lock(_mutex);
    drawFailedAgainLocked();
  }

  void drawFailedAgainLocked() {
    if (DawnContext::isDeviceLost()) {
      return;
    }
    for (auto &[id, failed] : _failed) {
      auto generation = _ledger.drawAgain(id);
      if (generation.has_value()) {
        worker().post([this, id = id, generation = *generation,
                       image = std::move(failed.image),
                       context = failed.context]() {
          produce(id, generation, image, context);
        });
      }
    }
    _failed.clear();
  }

  void discard(uint32_t id, RNSkPlatformContext &context) {
    _failed.erase(id);
    context.discardPresentedBitmap(id);
  }

  void abandon(const void *owner, uint32_t id, uint64_t generation,
               RNSkPlatformContext &context) {
    std::lock_guard<std::mutex> lock(_mutex);
    switch (_ledger.abandon(owner, id, generation)) {
    case RNSkPresentedImageLedger::Abandon::kDiscard:
      discard(id, context);
      return;
    case RNSkPresentedImageLedger::Abandon::kFail:
      context.presentFailure(id);
      return;
    case RNSkPresentedImageLedger::Abandon::kNothing:
      return;
    }
  }

  bool isCurrent(uint32_t id, uint64_t generation) {
    std::lock_guard<std::mutex> lock(_mutex);
    return _ledger.isCurrent(id, generation);
  }

  // A CPU image whose drawing failed, with the platform it was retained
  // for (see presentFailure).
  struct Failed {
    sk_sp<SkImage> image;
    std::weak_ptr<RNSkPlatformContext> context;
  };

  std::mutex _mutex;
  RNSkPresentedImageLedger _ledger;
  std::map<uint32_t, Failed> _failed;
};

} // namespace RNSkia
