#pragma once

#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "JsiSkConverters.h"
#include "JsiSkFont.h"
#include "JsiSkImage.h"
#include "JsiSkImageInfo.h"
#include "JsiSkMatrix.h"
#include "JsiSkNativeObjects.h"
#include "JsiSkPaint.h"
#include "JsiSkPath.h"
#include "JsiSkPicture.h"
#include "JsiSkPoint.h"
#include "JsiSkRRect.h"
#include "JsiSkRSXform.h"
#include "JsiSkSVG.h"
#include "JsiSkTextBlob.h"
#include "JsiSkVertices.h"

#include "utils/RNSkTypedArray.h"

#if defined(SK_GRAPHITE)
#include "rnskia/RNDawnContext.h"
#endif

#include <jsi/jsi.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkCanvas.h"
#include "include/core/SkFont.h"
#include "include/core/SkPaint.h"
#include "include/core/SkPath.h"
#include "include/core/SkPicture.h"
#include "include/core/SkRegion.h"
#include "include/core/SkSurface.h"
#include "include/core/SkTypeface.h"

#if !defined(SK_GRAPHITE)
#include "include/gpu/ganesh/GrDirectContext.h"
#endif

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkCanvas : public JsiSkNativeObject<JsiSkCanvas> {
public:
  static constexpr const char *CLASS_NAME = "Canvas";

  void drawPaint(std::shared_ptr<SkPaint> paint) {
    _canvas->drawPaint(*paint);
  }

  void drawLine(double x1, double y1, double x2, double y2,
                std::shared_ptr<SkPaint> paint) {
    _canvas->drawLine(x1, y1, x2, y2, *paint);
  }

  void drawRect(std::shared_ptr<SkRect> rect, std::shared_ptr<SkPaint> paint) {
    _canvas->drawRect(*rect, *paint);
  }

  // The drawImage* variants stay raw: they dispatch on exact argument counts
  // (count == 4 / count == 6) with null-tolerant trailing paints.
  JSI_HOST_FUNCTION(drawImage) {
    auto image = JsiSkImage::fromValue(runtime, arguments[0]);
    auto x = arguments[1].asNumber();
    auto y = arguments[2].asNumber();
    std::shared_ptr<SkPaint> paint;
    if (count == 4) {
      paint = JsiSkPaint::fromValue(runtime, arguments[3]);
    }
    _canvas->drawImage(image, x, y, SkSamplingOptions(), paint.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawImageRect) {
    auto image = JsiSkImage::fromValue(runtime, arguments[0]);
    auto src = JsiSkRect::fromValue(runtime, arguments[1]);
    auto dest = JsiSkRect::fromValue(runtime, arguments[2]);
    auto paint = JsiSkPaint::fromValue(runtime, arguments[3]);
    auto fastSample = count >= 5 && arguments[4].getBool();
    _canvas->drawImageRect(image, *src, *dest, SkSamplingOptions(), paint.get(),
                           fastSample ? SkCanvas::kFast_SrcRectConstraint
                                      : SkCanvas::kStrict_SrcRectConstraint);
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawImageCubic) {
    auto image = JsiSkImage::fromValue(runtime, arguments[0]);
    auto x = arguments[1].asNumber();
    auto y = arguments[2].asNumber();
    float B = arguments[3].asNumber();
    float C = arguments[4].asNumber();
    std::shared_ptr<SkPaint> paint;
    if (count == 6) {
      if (!arguments[5].isNull()) {
        paint = JsiSkPaint::fromValue(runtime, arguments[5]);
      }
    }
    _canvas->drawImage(image, x, y, SkSamplingOptions({B, C}), paint.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawImageOptions) {
    auto image = JsiSkImage::fromValue(runtime, arguments[0]);
    auto x = arguments[1].asNumber();
    auto y = arguments[2].asNumber();
    auto fm = (SkFilterMode)arguments[3].asNumber();
    auto mm = (SkMipmapMode)arguments[4].asNumber();
    std::shared_ptr<SkPaint> paint;
    if (count == 6) {
      if (!arguments[5].isNull()) {
        paint = JsiSkPaint::fromValue(runtime, arguments[5]);
      }
    }
    _canvas->drawImage(image, x, y, SkSamplingOptions(fm, mm), paint.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawImageNine) {
    auto image = JsiSkImage::fromValue(runtime, arguments[0]);
    auto center = JsiSkRect::fromValue(runtime, arguments[1]);
    auto dest = JsiSkRect::fromValue(runtime, arguments[2]);
    auto fm = (SkFilterMode)arguments[3].asNumber();
    std::shared_ptr<SkPaint> paint;
    if (count == 5) {
      if (!arguments[4].isNull()) {
        paint = JsiSkPaint::fromValue(runtime, arguments[4]);
      }
    }
    _canvas->drawImageNine(image.get(), center->round(), *dest, fm,
                           paint.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawImageRectCubic) {
    auto image = JsiSkImage::fromValue(runtime, arguments[0]);
    auto src = JsiSkRect::fromValue(runtime, arguments[1]);
    auto dest = JsiSkRect::fromValue(runtime, arguments[2]);
    float B = arguments[3].asNumber();
    float C = arguments[4].asNumber();
    std::shared_ptr<SkPaint> paint;
    if (count == 6) {
      if (!arguments[5].isNull()) {
        paint = JsiSkPaint::fromValue(runtime, arguments[5]);
      }
    }
    auto constraint =
        SkCanvas::kStrict_SrcRectConstraint; // TODO: get from caller
    _canvas->drawImageRect(image.get(), *src, *dest, SkSamplingOptions({B, C}),
                           paint.get(), constraint);
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawImageRectOptions) {
    auto image = JsiSkImage::fromValue(runtime, arguments[0]);
    auto src = JsiSkRect::fromValue(runtime, arguments[1]);
    auto dest = JsiSkRect::fromValue(runtime, arguments[2]);
    auto filter = (SkFilterMode)arguments[3].asNumber();
    auto mipmap = (SkMipmapMode)arguments[4].asNumber();
    std::shared_ptr<SkPaint> paint;
    if (count == 6) {
      if (!arguments[5].isNull()) {
        paint = JsiSkPaint::fromValue(runtime, arguments[5]);
      }
    }
    auto constraint = SkCanvas::kStrict_SrcRectConstraint;
    _canvas->drawImageRect(image.get(), *src, *dest, {filter, mipmap},
                           paint.get(), constraint);
    return jsi::Value::undefined();
  }

  void drawCircle(double cx, double cy, double radius,
                  std::shared_ptr<SkPaint> paint) {
    _canvas->drawCircle(cx, cy, radius, *paint);
  }

  void drawArc(std::shared_ptr<SkRect> oval, double startAngle,
               double sweepAngle, bool useCenter,
               std::shared_ptr<SkPaint> paint) {
    _canvas->drawArc(*oval, startAngle, sweepAngle, useCenter, *paint);
  }

  void drawRRect(std::shared_ptr<SkRRect> rect,
                 std::shared_ptr<SkPaint> paint) {
    _canvas->drawRRect(*rect, *paint);
  }

  void drawDRRect(std::shared_ptr<SkRRect> outer,
                  std::shared_ptr<SkRRect> inner,
                  std::shared_ptr<SkPaint> paint) {
    _canvas->drawDRRect(*outer, *inner, *paint);
  }

  void drawOval(std::shared_ptr<SkRect> rect, std::shared_ptr<SkPaint> paint) {
    _canvas->drawOval(*rect, *paint);
  }

  void restoreToCount(double c) { _canvas->restoreToCount(c); }

  int getSaveCount() { return static_cast<int>(_canvas->getSaveCount()); }

  std::shared_ptr<JsiSkMatrix> getTotalMatrix() {
    return std::make_shared<JsiSkMatrix>(getContext(),
                                         _canvas->getTotalMatrix());
  }

  void drawPoints(double pointMode, std::vector<SkPoint> points,
                  std::shared_ptr<SkPaint> paint) {
    // Check if we have at least one point
    if (points.empty()) {
      throw std::invalid_argument("Points array must not be empty");
    }
    auto p = SkSpan(points.data(), points.size());
    _canvas->drawPoints(static_cast<SkCanvas::PointMode>(pointMode), p, *paint);
  }

  void drawVertices(sk_sp<SkVertices> vertices, double blendMode,
                    std::shared_ptr<SkPaint> paint) {
    _canvas->drawVertices(vertices, static_cast<SkBlendMode>(blendMode),
                          *paint);
  }

  JSI_HOST_FUNCTION(drawPatch) {
    std::vector<SkPoint> cubics;
    std::vector<SkColor> colors;
    std::vector<SkPoint> texs;

    auto jsiCubics = arguments[0].asObject(runtime).asArray(runtime);
    auto cubicsSize = jsiCubics.size(runtime);

    // Validate cubic points - must be exactly 12 points
    if (cubicsSize != 12) {
      throw std::invalid_argument(
          "Cubic points array must contain exactly 12 points");
    }

    cubics.reserve(cubicsSize);
    for (int i = 0; i < cubicsSize; i++) {
      std::shared_ptr<SkPoint> point = JsiSkPoint::fromValue(
          runtime, jsiCubics.getValueAtIndex(runtime, i).asObject(runtime));
      cubics.push_back(*point.get());
    }

    if (count >= 2 && !arguments[1].isNull() && !arguments[1].isUndefined()) {
      auto jsiColors = arguments[1].asObject(runtime).asArray(runtime);
      auto colorsSize = jsiColors.size(runtime);

      // Validate colors array - must be exactly 4 colors
      if (colorsSize != 4) {
        throw std::invalid_argument(
            "Colors array must contain exactly 4 colors");
      }

      colors.reserve(colorsSize);
      for (int i = 0; i < colorsSize; i++) {
        SkColor color = JsiSkColor::fromValue(
            runtime, jsiColors.getValueAtIndex(runtime, i));
        colors.push_back(color);
      }
    }

    if (count >= 3 && !arguments[2].isNull() && !arguments[2].isUndefined()) {
      auto jsiTexs = arguments[2].asObject(runtime).asArray(runtime);
      auto texsSize = jsiTexs.size(runtime);

      // Validate textures array - must be exactly 4 points
      if (texsSize != 4) {
        throw std::invalid_argument(
            "Texture coordinates array must contain exactly 4 points");
      }

      texs.reserve(texsSize);
      for (int i = 0; i < texsSize; i++) {
        auto point = JsiSkPoint::fromValue(
            runtime, jsiTexs.getValueAtIndex(runtime, i).asObject(runtime));
        texs.push_back(*point.get());
      }
    }

    auto paint =
        count >= 4 ? JsiSkPaint::fromValue(runtime, arguments[4]) : nullptr;
    auto blendMode = static_cast<SkBlendMode>(arguments[3].asNumber());
    _canvas->drawPatch(cubics.data(), colors.empty() ? nullptr : colors.data(),
                       texs.empty() ? nullptr : texs.data(), blendMode, *paint);
    return jsi::Value::undefined();
  }

  void drawPath(std::shared_ptr<SkPathBuilder> path,
                std::shared_ptr<SkPaint> paint) {
    _canvas->drawPath(path->snapshot(), *paint);
  }

  void drawText(std::string textVal, double x, double y,
                std::shared_ptr<SkPaint> paint, std::shared_ptr<SkFont> font) {
    auto text = textVal.c_str();
    _canvas->drawSimpleText(text, strlen(text), SkTextEncoding::kUTF8, x, y,
                            *font, *paint);
  }

  void drawTextBlob(sk_sp<SkTextBlob> blob, double x, double y,
                    std::shared_ptr<SkPaint> paint) {
    _canvas->drawTextBlob(blob, x, y, *paint);
  }

  void drawGlyphs(std::vector<int> glyphIds, std::vector<SkPoint> positions,
                  double x, double y, std::shared_ptr<SkFont> font,
                  std::shared_ptr<SkPaint> paint) {
    SkPoint origin = SkPoint::Make(x, y);

    // Validate that glyphs and positions arrays have the same size
    if (glyphIds.size() != positions.size()) {
      throw std::invalid_argument(
          "Glyphs and positions arrays must have the same length");
    }

    std::vector<SkGlyphID> glyphs;
    glyphs.reserve(glyphIds.size());
    for (auto glyph : glyphIds) {
      glyphs.push_back(static_cast<SkGlyphID>(glyph));
    }

    auto g = SkSpan(glyphs.data(), glyphs.size());
    auto p = SkSpan(positions.data(), positions.size());
    _canvas->drawGlyphs(g, p, origin, *font, *paint);
  }

  void drawSvg(sk_sp<SkSVGDOM> svgdom, JsiOptional<double> w,
               JsiOptional<double> h) {
    if (w.has_value() && h.has_value()) {
      svgdom->setContainerSize(SkSize::Make(*w, *h));
    } else {
      auto canvasSize = _canvas->getBaseLayerSize();
      svgdom->setContainerSize(SkSize::Make(canvasSize));
    }
    svgdom->render(_canvas);
  }

  void clipPath(std::shared_ptr<SkPathBuilder> path, double op,
                bool doAntiAlias) {
    _canvas->clipPath(path->snapshot(), static_cast<SkClipOp>(op),
                      doAntiAlias);
  }

  void clipRect(std::shared_ptr<SkRect> rect, double op, bool doAntiAlias) {
    _canvas->clipRect(*rect, static_cast<SkClipOp>(op), doAntiAlias);
  }

  void clipRRect(std::shared_ptr<SkRRect> rrect, double op, bool doAntiAlias) {
    _canvas->clipRRect(*rrect, static_cast<SkClipOp>(op), doAntiAlias);
  }

  int save() { return _canvas->save(); }

  JSI_HOST_FUNCTION(saveLayer) {
    SkPaint *paint = (count >= 1 && !arguments[0].isUndefined())
                         ? JsiSkPaint::fromValue(runtime, arguments[0]).get()
                         : nullptr;
    SkRect *bounds =
        count >= 2 && !arguments[1].isNull() && !arguments[1].isUndefined()
            ? JsiSkRect::fromValue(runtime, arguments[1]).get()
            : nullptr;
    SkImageFilter *backdrop =
        count >= 3 && !arguments[2].isNull() && !arguments[2].isUndefined()
            ? JsiSkImageFilter::fromValue(runtime, arguments[2]).get()
            : nullptr;
    SkCanvas::SaveLayerFlags flags = count >= 4 ? arguments[3].asNumber() : 0;
    return jsi::Value(_canvas->saveLayer(
        SkCanvas::SaveLayerRec(bounds, paint, backdrop, flags)));
  }

  void restore() { _canvas->restore(); }

  void rotate(double degrees, double rx, double ry) {
    _canvas->rotate(degrees, rx, ry);
  }

  void translate(double dx, double dy) { _canvas->translate(dx, dy); }

  void scale(double sx, double sy) { _canvas->scale(sx, sy); }

  void skew(double sx, double sy) { _canvas->skew(sx, sy); }

  void drawColor(JsiColor cl, JsiOptional<double> mode) {
    if (mode.has_value()) {
      _canvas->drawColor(cl, static_cast<SkBlendMode>(*mode));
    } else {
      _canvas->drawColor(cl);
    }
  }

  void clear(JsiColor cl) { _canvas->clear(cl); }

  void concat(std::shared_ptr<SkMatrix> matrix) { _canvas->concat(*matrix); }

  void drawPicture(sk_sp<SkPicture> picture) {
    _canvas->drawPicture(picture);
  }

  JSI_HOST_FUNCTION(drawAtlas) {
    auto atlas = JsiSkImage::fromValue(runtime, arguments[0]);
    auto rects = arguments[1].asObject(runtime).asArray(runtime);
    auto transforms = arguments[2].asObject(runtime).asArray(runtime);
    auto paint = JsiSkPaint::fromValue(runtime, arguments[3]);
    auto blendMode = count > 5 && !arguments[4].isUndefined()
                         ? static_cast<SkBlendMode>(arguments[4].asNumber())
                         : SkBlendMode::kDstOver;

    std::vector<SkRSXform> xforms;
    int xformsSize = static_cast<int>(transforms.size(runtime));
    xforms.reserve(xformsSize);
    for (int i = 0; i < xformsSize; i++) {
      auto xform = JsiSkRSXform::fromValue(
          runtime, transforms.getValueAtIndex(runtime, i).asObject(runtime));
      xforms.push_back(*xform.get());
    }

    std::vector<SkRect> skRects;
    int rectsSize = static_cast<int>(rects.size(runtime));
    skRects.reserve(rectsSize);
    for (int i = 0; i < rectsSize; i++) {
      auto rect = JsiSkRect::fromValue(
          runtime, rects.getValueAtIndex(runtime, i).asObject(runtime));
      skRects.push_back(*rect.get());
    }

    // Validate transforms and rects have the same size
    if (xformsSize != rectsSize) {
      throw std::invalid_argument(
          "Transforms and rects arrays must have the same length");
    }

    std::vector<SkColor> colors;
    if (count > 5 && !arguments[5].isUndefined()) {
      auto colorsArray = arguments[5].asObject(runtime).asArray(runtime);
      int colorsSize = static_cast<int>(colorsArray.size(runtime));

      // Validate colors array matches the size of sprites and transforms
      if (colorsSize != rectsSize) {
        throw std::invalid_argument(
            "Colors array must have the same length as rects/transforms");
      }

      colors.reserve(colorsSize);
      for (int i = 0; i < colorsSize; i++) {
        // Convert from [r,g,b,a] in [0,1] to SkColor
        auto val = colorsArray.getValueAtIndex(runtime, i).asObject(runtime);
        float r = val.getProperty(runtime, "0").asNumber();
        float g = val.getProperty(runtime, "1").asNumber();
        float b = val.getProperty(runtime, "2").asNumber();
        float a = val.getProperty(runtime, "3").asNumber();

        // Convert to 8-bit color channels and pack into SkColor
        uint8_t r8 = static_cast<uint8_t>(r * 255);
        uint8_t g8 = static_cast<uint8_t>(g * 255);
        uint8_t b8 = static_cast<uint8_t>(b * 255);
        uint8_t a8 = static_cast<uint8_t>(a * 255);

        SkColor color = SkColorSetARGB(a8, r8, g8, b8);
        colors.push_back(color);
      }
    }
    SkSamplingOptions sampling(SkFilterMode::kLinear);
    if (count > 6) {
      sampling = SamplingOptionsFromValue(runtime, arguments[6]);
    }
    auto x = SkSpan(xforms.data(), xforms.size());
    auto t = SkSpan(skRects.data(), skRects.size());
    auto c = SkSpan(colors.data(), colors.size());
    _canvas->drawAtlas(atlas.get(), x, t, c, blendMode, sampling, nullptr,
                       paint.get());

    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(readPixels) {
    auto srcX = static_cast<int>(arguments[0].asNumber());
    auto srcY = static_cast<int>(arguments[1].asNumber());
    auto info = JsiSkImageInfo::fromValue(runtime, arguments[2]);
    if (!info) {
      return jsi::Value::null();
    }
    size_t bytesPerRow = 0;
    if (count > 4 && !arguments[4].isUndefined()) {
      bytesPerRow = static_cast<size_t>(arguments[4].asNumber());
    } else {
      bytesPerRow = info->minRowBytes();
    }
    auto dest =
        count > 3
            ? RNSkTypedArray::getTypedArray(runtime, arguments[3], *info)
            : RNSkTypedArray::getTypedArray(runtime, jsi::Value::null(), *info);
    if (!dest.isObject()) {
      return jsi::Value::null();
    }
    jsi::ArrayBuffer buffer =
        dest.asObject(runtime)
            .getProperty(runtime, jsi::PropNameID::forAscii(runtime, "buffer"))
            .asObject(runtime)
            .getArrayBuffer(runtime);
    auto bfrPtr = reinterpret_cast<void *>(buffer.data(runtime));

#if defined(SK_GRAPHITE)
    // Graphite records draws lazily and offers no synchronous GPU readback. If
    // this canvas belongs to a surface, snap & submit its recording, snapshot
    // it to a CPU raster image and read from that (mirroring
    // makeImageSnapshot). A canvas without an owning surface (e.g. a
    // picture-recording canvas) has no texture to read back, so fall through to
    // the raster canvas read below.
    if (_surface) {
      // Snapshot first: makeImageSnapshot records a copy task into the recorder
      // that must be submitted before the texture can be read back (this is the
      // same ordering used by JsiSkSurface::makeImageSnapshot and RNSkView).
      auto snapshot = _surface->makeImageSnapshot();
      if (auto *recorder = _surface->recorder()) {
        DawnContext::getInstance().submitRecording(recorder->snap().get());
      }
      auto raster = DawnContext::getInstance().MakeRasterImage(snapshot);
      if (!raster || !raster->readPixels(nullptr, *info, bfrPtr, bytesPerRow,
                                         srcX, srcY)) {
        return jsi::Value::null();
      }
      return dest;
    }
#endif

    if (!_canvas->readPixels(*info, bfrPtr, bytesPerRow, srcX, srcY)) {
      return jsi::Value::null();
    }
    return dest;
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installMethod(runtime, prototype, "drawPaint", &JsiSkCanvas::drawPaint);
    installMethod(runtime, prototype, "drawLine", &JsiSkCanvas::drawLine);
    installMethod(runtime, prototype, "drawRect", &JsiSkCanvas::drawRect);
    installHostMethod(runtime, prototype, "drawImage", &JsiSkCanvas::drawImage);
    installHostMethod(runtime, prototype, "drawImageRect",
                      &JsiSkCanvas::drawImageRect);
    installHostMethod(runtime, prototype, "drawImageCubic",
                      &JsiSkCanvas::drawImageCubic);
    installHostMethod(runtime, prototype, "drawImageOptions",
                      &JsiSkCanvas::drawImageOptions);
    installHostMethod(runtime, prototype, "drawImageNine",
                      &JsiSkCanvas::drawImageNine);
    installHostMethod(runtime, prototype, "drawImageRectCubic",
                      &JsiSkCanvas::drawImageRectCubic);
    installHostMethod(runtime, prototype, "drawImageRectOptions",
                      &JsiSkCanvas::drawImageRectOptions);
    installMethod(runtime, prototype, "drawCircle", &JsiSkCanvas::drawCircle);
    installMethod(runtime, prototype, "drawArc", &JsiSkCanvas::drawArc);
    installMethod(runtime, prototype, "drawRRect", &JsiSkCanvas::drawRRect);
    installMethod(runtime, prototype, "drawDRRect", &JsiSkCanvas::drawDRRect);
    installMethod(runtime, prototype, "drawOval", &JsiSkCanvas::drawOval);
    installMethod(runtime, prototype, "restoreToCount",
                  &JsiSkCanvas::restoreToCount);
    installMethod(runtime, prototype, "getSaveCount",
                  &JsiSkCanvas::getSaveCount);
    installMethod(runtime, prototype, "getTotalMatrix",
                  &JsiSkCanvas::getTotalMatrix);
    installMethod(runtime, prototype, "drawPoints", &JsiSkCanvas::drawPoints);
    installHostMethod(runtime, prototype, "drawPatch", &JsiSkCanvas::drawPatch);
    installMethod(runtime, prototype, "drawPath", &JsiSkCanvas::drawPath);
    installMethod(runtime, prototype, "drawVertices",
                  &JsiSkCanvas::drawVertices);
    installMethod(runtime, prototype, "drawText", &JsiSkCanvas::drawText);
    installMethod(runtime, prototype, "drawTextBlob",
                  &JsiSkCanvas::drawTextBlob);
    installMethod(runtime, prototype, "drawGlyphs", &JsiSkCanvas::drawGlyphs);
    installMethod(runtime, prototype, "drawSvg", &JsiSkCanvas::drawSvg);
    installMethod(runtime, prototype, "clipPath", &JsiSkCanvas::clipPath);
    installMethod(runtime, prototype, "clipRect", &JsiSkCanvas::clipRect);
    installMethod(runtime, prototype, "clipRRect", &JsiSkCanvas::clipRRect);
    installMethod(runtime, prototype, "save", &JsiSkCanvas::save);
    installHostMethod(runtime, prototype, "saveLayer", &JsiSkCanvas::saveLayer);
    installMethod(runtime, prototype, "restore", &JsiSkCanvas::restore);
    installMethod(runtime, prototype, "rotate", &JsiSkCanvas::rotate);
    installMethod(runtime, prototype, "translate", &JsiSkCanvas::translate);
    installMethod(runtime, prototype, "scale", &JsiSkCanvas::scale);
    installMethod(runtime, prototype, "skew", &JsiSkCanvas::skew);
    installMethod(runtime, prototype, "drawColor", &JsiSkCanvas::drawColor);
    installMethod(runtime, prototype, "clear", &JsiSkCanvas::clear);
    installMethod(runtime, prototype, "concat", &JsiSkCanvas::concat);
    installMethod(runtime, prototype, "drawPicture",
                  &JsiSkCanvas::drawPicture);
    installHostMethod(runtime, prototype, "drawAtlas", &JsiSkCanvas::drawAtlas);
    installHostMethod(runtime, prototype, "readPixels",
                      &JsiSkCanvas::readPixels);
  }

  size_t getMemoryPressure() override { return 1024; }

  explicit JsiSkCanvas(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkNativeObject<JsiSkCanvas>(std::move(context)) {}

  JsiSkCanvas(std::shared_ptr<RNSkPlatformContext> context, SkCanvas *canvas)
      : JsiSkCanvas(std::move(context)) {
    setCanvas(canvas);
  }

  void setCanvas(SkCanvas *canvas) { _canvas = canvas; }
  SkCanvas *getCanvas() { return _canvas; }

  // Optionally associate the canvas with its owning surface. This lets
  // readPixels fall back to a surface snapshot on Graphite, which has no
  // synchronous canvas readback.
  void setSurface(sk_sp<SkSurface> surface) { _surface = std::move(surface); }

private:
  SkCanvas *_canvas;
  sk_sp<SkSurface> _surface;
};
} // namespace RNSkia
