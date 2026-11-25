#pragma once

#include <algorithm>
#include <limits>
#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkConverters.h"
#include "JsiSkDispatcher.h"
#include "JsiSkNativeObjects.h"
#include "SkiaErrors.h"

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

  /**
   `generation`: the GPU device the surface draws on (see
   DawnContext::generation()), by default the device in use for a GPU
   surface and none for a CPU one. A dead surface (see makeDead) gives the
   lost device's.
   */
  JsiSkSurface(std::shared_ptr<RNSkPlatformContext> context,
               sk_sp<SkSurface> surface, uint64_t generation = UINT64_MAX)
      : JsiSkWrappingSkPtrNativeObject<JsiSkSurface, SkSurface>(
            std::move(context), surface),
        _dispatcher(Dispatcher::getDispatcher()),
        _generation(generation != UINT64_MAX ? generation
                    : surface != nullptr && surface->recorder() != nullptr
                        ? DawnContext::generation()
                        : 0) {
    // The surface belongs to the recorder of this thread, which is also the
    // thread that destroys the surfaces finalized elsewhere (see
    // releaseResources).
    _dispatcher->processQueue();
  }

  ~JsiSkSurface() override {
    // Collected by the GC: a canvas that JS still holds keeps the surface
    // alive (see getCanvas), so only the wrapper's own reference goes.
    if (!isDisposed()) {
      releaseSurface();
    }
  }

  /**
   A surface of a lost GPU device, like the GPU objects of a lost WebGPU
   device: its canvas takes the drawing commands and drops them, and its
   snapshots are dead images (see JsiSkImage::makeDead). What the GPU
   factories make while the device is lost (see DawnContext::isDeviceLost),
   in place of throwing.
   */
  static std::shared_ptr<JsiSkSurface>
  makeDead(std::shared_ptr<RNSkPlatformContext> context, int width,
           int height) {
    return std::make_shared<JsiSkSurface>(
        std::move(context),
        SkSurfaces::Null(std::max(width, 1), std::max(height, 1)),
        DawnContext::generation());
  }

  /** Whether the surface draws on a GPU device that was lost. */
  bool isDead() const {
    return _generation != 0 && !DawnContext::isCurrent(_generation);
  }

  // TODO-API: Properties?
  double width() { return static_cast<double>(getObject()->width()); }
  double height() { return static_cast<double>(getObject()->height()); }

  std::shared_ptr<JsiSkCanvas> getCanvas() {
    auto surface = getObject();
    // One wrapper per surface, as on CanvasKit: every call hands back the
    // same canvas (NativeObject::create caches the JS object per runtime),
    // and dispose() has a single canvas to detach.
    if (!_canvas) {
      _canvas =
          std::make_shared<JsiSkCanvas>(getContext(), surface->getCanvas());
      // The canvas keeps a reference to the surface so that it can read pixels
      // back through a snapshot on Graphite (which lacks synchronous canvas
      // readback), and so that it outlives a surface wrapper the GC collected
      // first.
      _canvas->setSurface(surface, _dispatcher);
    }
    return _canvas;
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
    // only Graphite-backed surfaces need to snap and submit a recording. One
    // made on a GPU device lost since submits nothing (see DawnContext).
    if (auto *recorder = surface->recorder()) {
      DawnContext::getInstance().submitRecording(
          recorder, sync ? skgpu::graphite::SyncToCpu::kYes
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
      if (_generation != 0) {
        // A surface of a lost device (or a dead one): a dead image.
        return JsiSkImage::makeDead(getContext(), surface->width(),
                                    surface->height(), _generation);
      }
      throw SkiaErrors::internal(
          "asImage: the texture of the surface cannot be sampled");
    }
    // The surface already reports the texture as its memory.
    return std::make_shared<JsiSkImage>(getContext(), std::move(image),
                                        sharesTexture, _generation);
  }

  JSI_HOST_FUNCTION(makeImageSnapshot) {
    _dispatcher->processQueue();
    auto surface = getObject();
    sk_sp<SkImage> image;
    if (count > 0 && arguments[0].isObject()) {
      auto rect = JsiSkRect::fromValue(runtime, arguments[0]);
      auto bounds = SkIRect::MakeXYWH(rect->x(), rect->y(), rect->width(),
                                      rect->height());
      if (!SkIRect::Intersects(
              bounds, SkIRect::MakeWH(surface->width(), surface->height()))) {
        // Nothing of the surface to snapshot: outputImage keeps its content.
        throw SkiaErrors::validation(
            "makeImageSnapshot: the bounds lie outside of the surface");
      }
      image = surface->makeImageSnapshot(bounds);
    } else {
      image = surface->makeImageSnapshot();
    }
    // A raster surface (e.g. Skia.Surface.Make) has no Graphite recorder; its
    // snapshot is already a valid CPU image, so skip the recording submit.
    if (auto *recorder = surface->recorder()) {
      DawnContext::getInstance().submitRecording(recorder);
    }
    // The snapshot belongs to the device of the surface; a surface that has
    // none to give (a dead one) gives a dead image of its size.
    auto generation =
        image == nullptr || image->isTextureBacked() ? _generation : 0;
    if (image == nullptr) {
      if (_generation == 0) {
        throw SkiaErrors::outOfMemory(
            "makeImageSnapshot: no memory for the snapshot");
      }
      image = JsiSkImage::makeEmptyImage(surface->width(), surface->height());
    }
    if (count > 1 && arguments[1].isObject()) {
      auto jsiImage = getJsiObject<JsiSkImage>(runtime, arguments[1]);
      jsiImage->setImage(image, generation);
      return jsi::Value(runtime, arguments[1]);
    }
    return makeJsiObject(
        runtime, std::make_shared<JsiSkImage>(getContext(), std::move(image),
                                              false, generation));
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
    // dispose(): the canvas lets go of its reference too, so that the texture
    // is freed now rather than once the canvas is collected (#4275). Drawing
    // on the canvas throws from here on.
    if (_canvas) {
      _canvas->detach();
    }
    releaseSurface();
  }

private:
  void releaseSurface() {
    // Destroying a Graphite surface flushes it into its recorder and
    // deregisters it from it, and a recorder is single-threaded. The GC may
    // finalize this object on any thread, and dispose() may be called from
    // another runtime: let the thread that created the surface destroy it.
    auto surface = getObjectUnchecked();
    setObject(nullptr);
    _dispatcher->release(std::move(surface));
  }

  std::shared_ptr<Dispatcher> _dispatcher;
  uint64_t _generation;
  std::shared_ptr<JsiSkCanvas> _canvas;
};

} // namespace RNSkia
