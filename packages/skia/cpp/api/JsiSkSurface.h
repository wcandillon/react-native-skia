#pragma once

#include <algorithm>
#include <limits>
#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkConverters.h"
#include "JsiSkDispatcher.h"
#include "JsiSkNativeObjects.h"

#include "JsiSkCanvas.h"
#include "JsiSkImage.h"

#include "rnskia/RNDawnContext.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkSurface.h"
#include "include/gpu/graphite/Surface.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkSurface
    : public JsiSkWrappingSkPtrNativeObject<JsiSkSurface, SkSurface> {
public:
  static constexpr const char *CLASS_NAME = "Surface";

  JsiSkSurface(std::shared_ptr<RNSkPlatformContext> context,
               sk_sp<SkSurface> surface)
      : JsiSkWrappingSkPtrNativeObject<JsiSkSurface, SkSurface>(
            std::move(context), std::move(surface)),
        _dispatcher(Dispatcher::getDispatcher()) {
    // The surface belongs to the recorder of this thread, which is also the
    // thread that destroys the surfaces finalized elsewhere (see
    // releaseResources).
    _dispatcher->processQueue();
  }

  ~JsiSkSurface() override {
    if (!isDisposed()) {
      releaseResources();
    }
  }

  // TODO-API: Properties?
  double width() { return static_cast<double>(getObject()->width()); }
  double height() { return static_cast<double>(getObject()->height()); }

  std::shared_ptr<JsiSkCanvas> getCanvas() {
    auto surface = getObject();
    auto canvas =
        std::make_shared<JsiSkCanvas>(getContext(), surface->getCanvas());
    // Keep a reference to the owning surface so the canvas can read pixels back
    // through a snapshot on Graphite (which lacks synchronous canvas readback).
    canvas->setSurface(surface, _dispatcher);
    return canvas;
  }

  void flush(JsiOptional<bool> syncParam) {
    _dispatcher->processQueue();
    auto surface = getObject();
    // When `sync` is true, block until the GPU has finished executing the
    // submitted work. Required before a consumer on a different command queue
    // (a secondary Dawn device, for instance) reads the texture this surface
    // draws into (see Surface.MakeFromGPUTexture). #3916
    bool sync = syncParam.has_value() && *syncParam;
    // A raster surface (e.g. Skia.Surface.Make) has no Graphite recorder;
    // only Graphite-backed surfaces need to snap and submit a recording.
    if (auto *recorder = surface->recorder()) {
      auto recording = recorder->snap();
      DawnContext::getInstance().submitRecording(
          recording.get(), sync ? skgpu::graphite::SyncToCpu::kYes
                                : skgpu::graphite::SyncToCpu::kNo);
    }
  }

  // An image sharing the texture of the surface, without a copy: a canvas
  // drawing it shows what the surface holds by then (flush the surface
  // first). A raster surface has no texture to share: its snapshot instead.
  std::shared_ptr<JsiSkImage> asImage() {
    _dispatcher->processQueue();
    auto surface = getObject();
    auto sharesTexture = surface->recorder() != nullptr;
    auto image = sharesTexture ? SkSurfaces::AsImage(surface)
                               : surface->makeImageSnapshot();
    if (image == nullptr) {
      throw std::runtime_error(
          "asImage: the texture of the surface cannot be sampled");
    }
    // The surface already reports the texture as its memory.
    return std::make_shared<JsiSkImage>(getContext(), std::move(image),
                                        sharesTexture);
  }

  JSI_HOST_FUNCTION(makeImageSnapshot) {
    _dispatcher->processQueue();
    auto surface = getObject();
    sk_sp<SkImage> image;
    if (count > 0 && arguments[0].isObject()) {
      auto rect = JsiSkRect::fromValue(runtime, arguments[0]);
      image = surface->makeImageSnapshot(SkIRect::MakeXYWH(
          rect->x(), rect->y(), rect->width(), rect->height()));
    } else {
      image = surface->makeImageSnapshot();
    }
    // A raster surface (e.g. Skia.Surface.Make) has no Graphite recorder; its
    // snapshot is already a valid CPU image, so skip the recording submit.
    if (auto *recorder = surface->recorder()) {
      auto recording = recorder->snap();
      DawnContext::getInstance().submitRecording(recording.get());
    }
    if (count > 1 && arguments[1].isObject()) {
      auto jsiImage = getJsiObject<JsiSkImage>(runtime, arguments[1]);
      jsiImage->setObject(image);
      return jsi::Value(runtime, arguments[1]);
    }
    return makeJsiObject(
        runtime, std::make_shared<JsiSkImage>(getContext(), std::move(image)));
  }

  size_t getMemoryPressure() override {
    if (isDisposed()) {
      return 0;
    }
    auto surface = getObjectUnchecked();
    if (!surface) {
      return 0;
    }

    const auto safeAdd = [](size_t a, size_t b) {
      if (std::numeric_limits<size_t>::max() - a < b) {
        return std::numeric_limits<size_t>::max();
      }
      return a + b;
    };

    SkImageInfo info = surface->imageInfo();
    size_t pixelBytes = info.computeMinByteSize();
    if (pixelBytes == 0) {
      auto width = std::max(info.width(), surface->width());
      auto height = std::max(info.height(), surface->height());
      int bytesPerPixel = info.bytesPerPixel();
      if (bytesPerPixel <= 0) {
        bytesPerPixel = 4;
      }
      if (width > 0 && height > 0) {
        pixelBytes = static_cast<size_t>(width) * static_cast<size_t>(height) *
                     static_cast<size_t>(bytesPerPixel);
      }
    }

    if (pixelBytes == 0) {
      return 0;
    }

    size_t estimated = pixelBytes;

    auto canvas = surface->getCanvas();
    const bool isGpuBacked = surface->recorder() != nullptr ||
                             (canvas && canvas->recorder() != nullptr);

    if (isGpuBacked) {
      // Account for a resolved texture and depth/stencil attachments.
      estimated = safeAdd(estimated, pixelBytes);     // resolve/texture copy
      estimated = safeAdd(estimated, pixelBytes / 2); // depth-stencil buffers
    }

    // Add a small overhead buffer for bookkeeping allocations.
    estimated = safeAdd(estimated, 128 * 1024);

    return estimated;
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    installMethod(runtime, prototype, "width", &JsiSkSurface::width);
    installMethod(runtime, prototype, "height", &JsiSkSurface::height);
    installMethod(runtime, prototype, "getCanvas", &JsiSkSurface::getCanvas);
    installHostMethod(runtime, prototype, "makeImageSnapshot",
                      &JsiSkSurface::makeImageSnapshot);
    installMethod(runtime, prototype, "asImage", &JsiSkSurface::asImage);
    installMethod(runtime, prototype, "flush", &JsiSkSurface::flush);
  }

protected:
  void releaseResources() override {
    // Destroying a Graphite surface flushes it into its recorder and
    // deregisters it from it, and a recorder is single-threaded. The GC may
    // finalize this object on any thread, and dispose() may be called from
    // another runtime: let the thread that created the surface destroy it.
    auto surface = getObjectUnchecked();
    setObject(nullptr);
    _dispatcher->release(std::move(surface));
  }

private:
  std::shared_ptr<Dispatcher> _dispatcher;
};

} // namespace RNSkia
