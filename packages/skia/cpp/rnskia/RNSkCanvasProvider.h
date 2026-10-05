#pragma once

#include <functional>
#include <memory>
#include <utility>
#include <vector>

#include "RNDawnContext.h"
#include "RNDawnUtils.h"
#include "RNSkPlatformContext.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkCanvas.h"
#include "include/core/SkImage.h"
#include "include/core/SkSurface.h"
#include "include/gpu/graphite/Recording.h"
#include "include/gpu/graphite/TextureInfo.h"
#include "include/gpu/graphite/dawn/DawnGraphiteTypes.h"

#pragma clang diagnostic pop

namespace RNSkia {

/**
 * Describes the texture a recording is replayed onto: the pixel size, the
 * format and the color space of a window (or offscreen) surface. A deferred
 * canvas is recorded against this description, so it can be created before
 * the surface itself exists.
 */
struct RNSkGraphiteTargetInfo {
  int width = 0;
  int height = 0;
  SkColorType colorType = kUnknown_SkColorType;
  // Display P3 rather than sRGB (see DawnUtils::viewColorSpace). The colors
  // of a recording are converted to the color space of its target when it is
  // recorded, not when it is replayed.
  bool useP3ColorSpace = false;
  skgpu::graphite::TextureInfo textureInfo;
};

/**
 * The surface a view presents into: a platform window (a CAMetalLayer, an
 * ANativeWindow) or an offscreen surface. It describes its target texture to
 * whoever records for the view and replays their recordings onto it.
 */
class RNSkCanvasProvider {
public:
  virtual ~RNSkCanvasProvider() = default;

  /** Width of the surface, in pixels. */
  virtual int getWidth() = 0;

  /** Height of the surface, in pixels. */
  virtual int getHeight() = 0;

  /**
   Describes the current target texture. Safe to call from any thread;
   returns false while there is no surface to describe.
   */
  virtual bool getTargetInfo(RNSkGraphiteTargetInfo *info) = 0;

  /**
   The size in pixels the surface will have, known from the platform layout
   before the surface itself exists (on Android the surface only appears a
   frame after the view is laid out). Safe to call from any thread; returns
   false until the view is laid out. A frame recorded against this size is
   presented as is once the surface appears, where one recorded against a
   size derived from the layout in points could be off by a pixel and would
   not cover the surface.
   */
  virtual bool getLayoutSize(int *width, int *height) { return false; }

  /**
   Replays the recordings, in order, onto the target texture and presents
   it. Called on the thread that owns the surface. Returns false when the
   surface cannot present right now (there is none, or the app is in the
   background): nothing was consumed.
   */
  virtual bool presentRecordings(
      const std::vector<skgpu::graphite::Recording *> &recordings) = 0;

  /**
   Draws an image at the origin of the target texture and presents it. Same
   thread and return value as presentRecordings(). Used for a recording whose
   size or color space differs from the target's: it is replayed into a
   texture of its own first (see RNSkView::present).
   */
  virtual bool presentImage(const sk_sp<SkImage> &image) = 0;

  /**
   Installed by the view owning the provider: asks it for a frame when the
   surface appears or changes size.
   */
  void setRequestRedraw(std::function<void()> requestRedraw) {
    _requestRedraw = std::move(requestRedraw);
  }

protected:
  void requestRedraw() {
    if (_requestRedraw) {
      _requestRedraw();
    }
  }

private:
  std::function<void()> _requestRedraw;
};

/**
 * An offscreen surface the content of a view is replayed into for a snapshot.
 * A recording is replayed as is, so the surface takes the color space of the
 * recordings it is meant for.
 */
class RNSkOffscreenCanvasProvider : public RNSkCanvasProvider {
public:
  RNSkOffscreenCanvasProvider(
      const std::shared_ptr<RNSkPlatformContext> &context, int width,
      int height, bool useP3ColorSpace = false)
      : _width(width), _height(height), _pd(context->getPixelDensity()),
        _useP3ColorSpace(useP3ColorSpace),
        _surface(
            context->makeOffscreenSurface(width, height, useP3ColorSpace)) {}

  virtual ~RNSkOffscreenCanvasProvider() = default;

  /** The canvas of the surface, in pixels; nullptr without a surface. */
  SkCanvas *getCanvas() { return _surface ? _surface->getCanvas() : nullptr; }

  /**
   A GPU image of the surface, usable by any recorder of the context once
   this returns; nullptr without a surface.
   */
  sk_sp<SkImage> makeImage() {
    if (_surface == nullptr) {
      return nullptr;
    }
    auto image = _surface->makeImageSnapshot();
    // The snapshot is a copy task on the surface's recorder: submitted here,
    // so that the image is complete for whoever draws it next.
    if (auto *recorder = _surface->recorder()) {
      DawnContext::getInstance().submitRecording(recorder->snap().get());
    }
    return image;
  }

  /**
   Returns a snapshot of the current surface/canvas
   */
  sk_sp<SkImage> makeSnapshot(SkRect *bounds) {
    if (_surface == nullptr) {
      return nullptr;
    }
    sk_sp<SkImage> image;
    if (bounds != nullptr) {
      SkIRect b =
          SkIRect::MakeXYWH(bounds->x() * _pd, bounds->y() * _pd,
                            bounds->width() * _pd, bounds->height() * _pd);
      image = _surface->makeImageSnapshot(b);
    } else {
      image = _surface->makeImageSnapshot();
    }
    // Only Graphite-backed surfaces have a recorder to snap/submit; a raster
    // surface's snapshot is already a valid CPU image.
    if (auto *recorder = _surface->recorder()) {
      DawnContext::getInstance().submitRecording(recorder->snap().get());
    }
    return DawnContext::getInstance().MakeRasterImage(image);
  }

  int getWidth() override { return _width; }

  int getHeight() override { return _height; }

  bool getTargetInfo(RNSkGraphiteTargetInfo *info) override {
    if (_surface == nullptr || _surface->recorder() == nullptr) {
      return false;
    }
    // Graphite gives its render targets the sampled+renderable usage, a
    // superset of what a deferred canvas asks for.
    auto colorType = _surface->imageInfo().colorType();
    info->width = _width;
    info->height = _height;
    info->colorType = colorType;
    info->useP3ColorSpace = _useP3ColorSpace;
    info->textureInfo = skgpu::graphite::TextureInfos::MakeDawn(
        skgpu::graphite::DawnTextureInfo(
            skgpu::graphite::SampleCount::k1, skgpu::Mipmapped::kNo,
            DawnUtils::textureFormatForColorType(colorType),
            DawnUtils::DefaultTargetUsage, wgpu::TextureAspect::All));
    return true;
  }

  bool presentRecordings(
      const std::vector<skgpu::graphite::Recording *> &recordings) override {
    auto *recorder = _surface ? _surface->recorder() : nullptr;
    if (recorder == nullptr) {
      return false;
    }
    // A new surface clears itself in its first pass, which its own recorder
    // only records when it next snaps. The recordings go straight to the
    // context, so that clear would run after them and wipe them: record and
    // submit it first (the explicit clear makes sure the pass is emitted).
    if (!_cleared) {
      _surface->getCanvas()->clear(SK_ColorTRANSPARENT);
      DawnContext::getInstance().submitRecording(recorder->snap().get());
      _cleared = true;
    }
    return DawnContext::getInstance().insertRecordings(recordings,
                                                       _surface.get());
  }

  bool presentImage(const sk_sp<SkImage> &image) override {
    if (_surface == nullptr) {
      return false;
    }
    _surface->getCanvas()->drawImage(image, 0, 0);
    return true;
  }

private:
  int _width;
  int _height;
  float _pd;
  bool _useP3ColorSpace;
  sk_sp<SkSurface> _surface;
  bool _cleared = false;
};

} // namespace RNSkia
