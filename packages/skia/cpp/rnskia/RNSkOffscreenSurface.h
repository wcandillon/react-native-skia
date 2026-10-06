#pragma once

#include <memory>
#include <vector>

#include "RNDawnContext.h"
#include "RNDawnUtils.h"
#include "RNSkPlatformContext.h"
#include "RNSkSurface.h"

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
 * An offscreen surface the content of a view is replayed into for a snapshot,
 * or a recording made for another size or color space than the window's. A
 * recording is replayed as is, so the surface takes the color space of the
 * recordings it is meant for.
 */
class RNSkOffscreenSurface final : public RNSkSurface {
public:
  RNSkOffscreenSurface(const std::shared_ptr<RNSkPlatformContext> &context,
                       int width, int height, bool useP3ColorSpace = false)
      : _width(width), _height(height), _pd(context->getPixelDensity()),
        _useP3ColorSpace(useP3ColorSpace),
        _surface(
            context->makeOffscreenSurface(width, height, useP3ColorSpace)) {}

  ~RNSkOffscreenSurface() override = default;

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
