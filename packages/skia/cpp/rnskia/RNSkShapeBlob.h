#pragma once

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <cstring>
#include <limits>
#include <mutex>
#include <utility>
#include <vector>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkBlendMode.h"
#include "include/core/SkCanvas.h"
#include "include/core/SkColor.h"
#include "include/core/SkData.h"
#include "include/core/SkImage.h"
#include "include/core/SkImageInfo.h"
#include "include/core/SkMaskFilter.h"
#include "include/core/SkMatrix.h"
#include "include/core/SkPaint.h"
#include "include/core/SkPathEffect.h"
#include "include/core/SkPoint.h"
#include "include/core/SkRRect.h"
#include "include/core/SkRect.h"
#include "include/core/SkSamplingOptions.h"
#include "include/core/SkShader.h"
#include "include/core/SkTileMode.h"
#include "include/core/SkVertices.h"

#pragma clang diagnostic pop

namespace RNSkia {

// A shape blob draws many filled rectangles, rounded rectangles and circles
// in one drawVertices call. Graphite records each drawRect, drawRRect or
// drawCircle as its own draw (clip, paint key, sort key, per-frame sort), so a
// scene of thousands of small static shapes is bound by the CPU cost per draw.
// A shape blob is an atlas built for the caller: unlike drawAtlasAsVertices
// (RNSkAtlas.h), which writes six vertices per sprite on every draw, it keeps
// its SkVertices between frames and patches only the instances that change.
//
// Every distinct shape (kind, size, radii) is rasterized once, white, into an
// atlas image: analytic coverage, a transparent margin of at least one pixel,
// premultiplied RGBA. Each instance is a textured quad of two triangles (six
// vertices, no indices: SkVertices indices are 16 bits and 20,000 quads need
// 80,000 vertices) whose vertex color is the instance color. drawVertices
// with SkBlendMode::kModulate multiplies the vertex color by the white sprite,
// which gives the shape's coverage in the instance color.
//
// Sprite resolution. The sprites are rasterized at a scale in pixels per
// local unit. By default it follows the device scale of the canvas the blob
// is drawn on (the largest scale of the local-to-device matrix, so a rotation
// does not change it), and the atlas is rasterized again only when that scale
// leaves [0.75, 1.5] times the scale of the current atlas. A blob made with a
// fixed raster scale never rasterizes again for a scale change; that is the
// option for a blob recorded into a picture, whose recording canvas has no
// device scale.
//
// Threads. The instance data lives on the CPU. Setters (setPosition,
// setColor) patch the six vertices of one instance under a mutex and mark the
// blob dirty: no allocation. draw() takes the same mutex to bring the atlas
// and the SkVertices up to date (a copy of the vertex arrays, only when
// dirty) and draws outside of it. A picture that recorded the blob holds the
// SkVertices of that time: later setters do not change it.

enum class ShapeBlobKind : uint8_t { kRect = 0, kRRect = 1, kCircle = 2 };

// Each instance is two triangles, in the order SkDevice::drawAtlas uses.
inline constexpr int kShapeBlobVerticesPerShape = 6;

// The atlas is rasterized again when the device scale leaves this band
// around the scale of the current atlas.
inline constexpr float kShapeBlobMinScaleRatio = 0.75f;
inline constexpr float kShapeBlobMaxScaleRatio = 1.5f;

// No sprite is rasterized larger than this many pixels on a side: past it the
// raster scale is lowered for the whole atlas.
inline constexpr float kShapeBlobMaxSpritePixels = 2048.0f;

// Cells are packed in rows of at most this many pixels (or the widest cell).
inline constexpr int kShapeBlobAtlasRowWidth = 2048;

// The largest scale of the 2x2 matrix [a b; c d] (its largest singular
// value), which rotation does not change.
inline float shapeBlobDeviceScale(double a, double b, double c, double d) {
  const double s = a * a + b * b + c * c + d * d;
  const double det = a * d - b * c;
  const double disc = std::max(0.0, s * s - 4.0 * det * det);
  return static_cast<float>(std::sqrt((s + std::sqrt(disc)) / 2.0));
}

// The device scale of `m`, or -1 for a perspective matrix.
inline float shapeBlobDeviceScale(const SkMatrix &m) {
  if (m.hasPerspective()) {
    return -1.0f;
  }
  return shapeBlobDeviceScale(m.getScaleX(), m.getSkewX(), m.getSkewY(),
                              m.getScaleY());
}

// Coverage, in [0, 1], of the pixel (px, py) of a cell whose shape occupies
// [mx, mx + w] x [my, my + h] (pixels). Rectangles use the exact area of the
// pixel they cover; circles and rounded corners a signed distance at the
// pixel center, clamped to one pixel of ramp.
inline float shapeBlobCoverage(ShapeBlobKind kind, float w, float h, float rx,
                               float ry, float mx, float my, int px, int py) {
  if (w <= 0 || h <= 0) {
    return 0;
  }
  if (kind == ShapeBlobKind::kRect ||
      (kind == ShapeBlobKind::kRRect && (rx <= 0 || ry <= 0))) {
    const float ox = std::max(0.0f, std::min(px + 1.0f, mx + w) -
                                        std::max(static_cast<float>(px), mx));
    const float oy = std::max(0.0f, std::min(py + 1.0f, my + h) -
                                        std::max(static_cast<float>(py), my));
    return std::min(1.0f, ox * oy);
  }
  const float cx = mx + w / 2;
  const float cy = my + h / 2;
  const float dx = px + 0.5f - cx;
  const float dy = py + 0.5f - cy;
  float d;
  if (kind == ShapeBlobKind::kCircle) {
    d = std::sqrt(dx * dx + dy * dy) - w / 2;
  } else {
    const float bx = w / 2;
    const float by = h / 2;
    rx = std::min(rx, bx);
    ry = std::min(ry, by);
    const float ax = std::fabs(dx);
    const float ay = std::fabs(dy);
    const float kx = bx - rx;
    const float ky = by - ry;
    if (ax > kx && ay > ky) {
      const float qx = ax - kx;
      const float qy = ay - ky;
      if (rx == ry) {
        d = std::sqrt(qx * qx + qy * qy) - rx;
      } else {
        // The distance to an ellipse, to first order: f / |grad f|.
        const float f = (qx * qx) / (rx * rx) + (qy * qy) / (ry * ry) - 1;
        const float gx = 2 * qx / (rx * rx);
        const float gy = 2 * qy / (ry * ry);
        const float g = std::sqrt(gx * gx + gy * gy);
        d = g > 0 ? f / g : -std::min(rx, ry);
      }
    } else {
      d = std::max(ax - bx, ay - by);
    }
  }
  return std::min(1.0f, std::max(0.0f, 0.5f - d));
}

/**
 * The CPU side of a shape blob: instances, distinct sprites, the atlas
 * layout and the vertex arrays. Not thread-safe on its own (RNSkShapeBlob
 * guards it) and free of Skia objects, so that it can be checked on the host.
 */
class ShapeBlobData {
public:
  struct Sprite {
    ShapeBlobKind kind;
    float width; // local units
    float height;
    float rx;
    float ry;
    // Layout at the current raster scale.
    SkRect tex;  // the cell in atlas pixels
    SkRect quad; // the cell in local units, relative to the instance anchor
    float marginX = 0; // pixels from the cell edge to the shape
    float marginY = 0;
  };

  struct Instance {
    SkPoint anchor; // top-left of a (rounded) rectangle, center of a circle
    uint32_t sprite;
    SkColor color;
  };

  int addShape(ShapeBlobKind kind, float x, float y, float width, float height,
               float rx, float ry, SkColor color) {
    if (_instances.size() >=
        static_cast<size_t>(std::numeric_limits<int>::max() /
                            kShapeBlobVerticesPerShape)) {
      return -1;
    }
    const uint32_t sprite = findOrAddSprite(kind, width, height, rx, ry);
    const auto index = _instances.size();
    _instances.push_back({SkPoint::Make(x, y), sprite, color});
    _positions.resize(_positions.size() + kShapeBlobVerticesPerShape);
    _texCoords.resize(_texCoords.size() + kShapeBlobVerticesPerShape);
    _colors.resize(_colors.size() + kShapeBlobVerticesPerShape);
    std::fill_n(_colors.data() + index * kShapeBlobVerticesPerShape,
                kShapeBlobVerticesPerShape, color);
    if (_laidOut) {
      writeQuad(index);
    }
    _verticesDirty = true;
    return static_cast<int>(index);
  }

  bool setPosition(size_t index, float x, float y) {
    if (index >= _instances.size()) {
      return false;
    }
    _instances[index].anchor = SkPoint::Make(x, y);
    if (_laidOut) {
      writePositions(index);
    }
    _verticesDirty = true;
    return true;
  }

  bool setColor(size_t index, SkColor color) {
    if (index >= _instances.size()) {
      return false;
    }
    _instances[index].color = color;
    std::fill_n(_colors.data() + index * kShapeBlobVerticesPerShape,
                kShapeBlobVerticesPerShape, color);
    _verticesDirty = true;
    return true;
  }

  size_t count() const { return _instances.size(); }
  size_t vertexCount() const { return _positions.size(); }
  const std::vector<Sprite> &sprites() const { return _sprites; }
  const std::vector<Instance> &instances() const { return _instances; }
  const SkPoint *positions() const { return _positions.data(); }
  const SkPoint *texCoords() const { return _texCoords.data(); }
  const SkColor *colors() const { return _colors.data(); }
  bool laidOut() const { return _laidOut; }
  bool verticesDirty() const { return _verticesDirty; }
  void clearVerticesDirty() { _verticesDirty = false; }
  float rasterScale() const { return _rasterScale; }
  int atlasWidth() const { return _atlasWidth; }
  int atlasHeight() const { return _atlasHeight; }

  /**
   * The raster scale the atlas needs for a draw at `deviceScale`, or 0 when
   * the current atlas is fine. `fixedScale` > 0 pins the scale (a scale
   * change never rasterizes again).
   */
  float scaleToRasterize(float deviceScale, float fixedScale) const {
    float target = fixedScale > 0 ? fixedScale : deviceScale;
    if (!(target > 0) || !std::isfinite(target)) {
      // A perspective or degenerate matrix: keep the atlas if there is one.
      if (_laidOut) {
        return 0;
      }
      target = 1;
    }
    if (!_laidOut) {
      return target;
    }
    if (fixedScale > 0) {
      return 0;
    }
    if (target < _requestedScale * kShapeBlobMinScaleRatio ||
        target > _requestedScale * kShapeBlobMaxScaleRatio) {
      return target;
    }
    return 0;
  }

  /**
   * Lays out every sprite at `scale` (clamped so that no sprite exceeds
   * kShapeBlobMaxSpritePixels) and writes every quad. Returns the scale used.
   */
  float layout(float requestedScale) {
    float maxSide = 0;
    for (const auto &sprite : _sprites) {
      maxSide = std::max({maxSide, sprite.width, sprite.height});
    }
    float scale = requestedScale;
    if (maxSide * scale > kShapeBlobMaxSpritePixels) {
      scale = kShapeBlobMaxSpritePixels / maxSide;
    }
    _requestedScale = requestedScale;
    _rasterScale = scale;
    // Shelf packing, in insertion order.
    int x = 0;
    int y = 0;
    int rowHeight = 0;
    int width = 0;
    for (auto &sprite : _sprites) {
      const float w = sprite.width * scale;
      const float h = sprite.height * scale;
      const int cw = static_cast<int>(std::ceil(w)) + 2;
      const int ch = static_cast<int>(std::ceil(h)) + 2;
      if (x > 0 && x + cw > kShapeBlobAtlasRowWidth) {
        x = 0;
        y += rowHeight;
        rowHeight = 0;
      }
      sprite.tex = SkRect::MakeXYWH(x, y, cw, ch);
      sprite.marginX = (cw - w) / 2;
      sprite.marginY = (ch - h) / 2;
      // The quad covers the whole cell; the anchor is the shape's top-left,
      // or its center for a circle.
      const float left = sprite.kind == ShapeBlobKind::kCircle
                             ? -(cw / 2.0f) / scale
                             : -sprite.marginX / scale;
      const float top = sprite.kind == ShapeBlobKind::kCircle
                            ? -(ch / 2.0f) / scale
                            : -sprite.marginY / scale;
      sprite.quad = SkRect::MakeXYWH(left, top, cw / scale, ch / scale);
      x += cw;
      rowHeight = std::max(rowHeight, ch);
      width = std::max(width, x);
    }
    _atlasWidth = std::max(width, 1);
    _atlasHeight = std::max(y + rowHeight, 1);
    _laidOut = true;
    _spritesDirty = false;
    for (size_t i = 0; i < _instances.size(); i++) {
      writeQuad(i);
    }
    _verticesDirty = true;
    return scale;
  }

  bool spritesDirty() const { return _spritesDirty; }

  /**
   * Writes the atlas pixels (white, premultiplied RGBA_8888, tightly packed
   * rows of atlasWidth() pixels) into `pixels`, which must hold
   * atlasWidth() * atlasHeight() * 4 bytes.
   */
  void rasterize(uint8_t *pixels) const {
    const size_t rowBytes = static_cast<size_t>(_atlasWidth) * 4;
    std::memset(pixels, 0, rowBytes * _atlasHeight);
    for (const auto &sprite : _sprites) {
      const float w = sprite.width * _rasterScale;
      const float h = sprite.height * _rasterScale;
      const float rx = sprite.rx * _rasterScale;
      const float ry = sprite.ry * _rasterScale;
      const int x0 = static_cast<int>(sprite.tex.left());
      const int y0 = static_cast<int>(sprite.tex.top());
      const int cw = static_cast<int>(sprite.tex.width());
      const int ch = static_cast<int>(sprite.tex.height());
      for (int py = 0; py < ch; py++) {
        uint8_t *row = pixels + (y0 + py) * rowBytes + x0 * 4;
        for (int px = 0; px < cw; px++) {
          const float cov =
              shapeBlobCoverage(sprite.kind, w, h, rx, ry, sprite.marginX,
                                sprite.marginY, px, py);
          const auto v = static_cast<uint8_t>(std::lround(cov * 255));
          row[px * 4 + 0] = v;
          row[px * 4 + 1] = v;
          row[px * 4 + 2] = v;
          row[px * 4 + 3] = v;
        }
      }
    }
  }

private:
  uint32_t findOrAddSprite(ShapeBlobKind kind, float width, float height,
                           float rx, float ry) {
    for (size_t i = 0; i < _sprites.size(); i++) {
      const auto &s = _sprites[i];
      if (s.kind == kind && s.width == width && s.height == height &&
          s.rx == rx && s.ry == ry) {
        return static_cast<uint32_t>(i);
      }
    }
    _sprites.push_back({kind, width, height, rx, ry, SkRect::MakeEmpty(),
                        SkRect::MakeEmpty()});
    // A new sprite needs a new atlas.
    _spritesDirty = true;
    _laidOut = false;
    return static_cast<uint32_t>(_sprites.size() - 1);
  }

  void writePositions(size_t index) {
    const auto &instance = _instances[index];
    const SkRect q = _sprites[instance.sprite].quad.makeOffset(instance.anchor);
    SkPoint *p = _positions.data() + index * kShapeBlobVerticesPerShape;
    p[0] = {q.fLeft, q.fTop};
    p[1] = {q.fRight, q.fTop};
    p[2] = {q.fRight, q.fBottom};
    p[3] = {q.fLeft, q.fTop};
    p[4] = {q.fRight, q.fBottom};
    p[5] = {q.fLeft, q.fBottom};
  }

  void writeQuad(size_t index) {
    writePositions(index);
    const SkRect &t = _sprites[_instances[index].sprite].tex;
    SkPoint *p = _texCoords.data() + index * kShapeBlobVerticesPerShape;
    p[0] = {t.fLeft, t.fTop};
    p[1] = {t.fRight, t.fTop};
    p[2] = {t.fRight, t.fBottom};
    p[3] = {t.fLeft, t.fTop};
    p[4] = {t.fRight, t.fBottom};
    p[5] = {t.fLeft, t.fBottom};
  }

  std::vector<Sprite> _sprites;
  std::vector<Instance> _instances;
  std::vector<SkPoint> _positions;
  std::vector<SkPoint> _texCoords;
  std::vector<SkColor> _colors;
  float _requestedScale = 0;
  float _rasterScale = 0;
  int _atlasWidth = 0;
  int _atlasHeight = 0;
  bool _laidOut = false;
  bool _spritesDirty = false;
  bool _verticesDirty = true;
};

/**
 * A mutable batch of filled shapes drawn with one drawVertices call. See the
 * comment at the top of this file.
 */
class RNSkShapeBlob {
public:
  /** `fixedScale` > 0 pins the raster scale; 0 follows the device scale. */
  explicit RNSkShapeBlob(float fixedScale = 0) : _fixedScale(fixedScale) {}

  int addRect(const SkRect &rect, SkColor color) {
    const SkRect r = rect.makeSorted();
    std::lock_guard<std::mutex> lock(_mutex);
    return _data.addShape(ShapeBlobKind::kRect, r.x(), r.y(), r.width(),
                          r.height(), 0, 0, color);
  }

  int addRRect(const SkRRect &rrect, SkColor color) {
    const SkRect r = rrect.rect();
    const SkVector radii = rrect.getSimpleRadii();
    std::lock_guard<std::mutex> lock(_mutex);
    return _data.addShape(ShapeBlobKind::kRRect, r.x(), r.y(), r.width(),
                          r.height(), radii.x(), radii.y(), color);
  }

  int addCircle(float cx, float cy, float r, SkColor color) {
    const float d = 2 * std::max(0.0f, r);
    std::lock_guard<std::mutex> lock(_mutex);
    return _data.addShape(ShapeBlobKind::kCircle, cx, cy, d, d, 0, 0, color);
  }

  bool setPosition(size_t index, float x, float y) {
    std::lock_guard<std::mutex> lock(_mutex);
    return _data.setPosition(index, x, y);
  }

  bool setColor(size_t index, SkColor color) {
    std::lock_guard<std::mutex> lock(_mutex);
    return _data.setColor(index, color);
  }

  size_t count() {
    std::lock_guard<std::mutex> lock(_mutex);
    return _data.count();
  }

  float fixedScale() const { return _fixedScale; }

  size_t approximateBytes() {
    std::lock_guard<std::mutex> lock(_mutex);
    return _data.count() * (sizeof(ShapeBlobData::Instance) +
                            kShapeBlobVerticesPerShape *
                                (2 * sizeof(SkPoint) + sizeof(SkColor))) +
           static_cast<size_t>(_data.atlasWidth()) * _data.atlasHeight() * 4;
  }

  /**
   * Draws every shape with one drawVertices call under the canvas's current
   * matrix and clip. `paint` (optional) contributes its alpha, blend mode,
   * color filter and image filter; its color, shader, style, path effect and
   * mask filter are ignored.
   */
  void draw(SkCanvas *canvas, const SkPaint *paint) {
    if (canvas == nullptr) {
      return;
    }
    const float deviceScale =
        shapeBlobDeviceScale(canvas->getLocalToDeviceAs3x3());
    sk_sp<SkVertices> vertices;
    sk_sp<SkShader> shader;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      if (_data.count() == 0) {
        return;
      }
      const float scale = _data.scaleToRasterize(deviceScale, _fixedScale);
      if (scale > 0 || _data.spritesDirty() || !_data.laidOut() || !_shader) {
        rasterize(scale > 0 ? scale : nonZeroScale(deviceScale));
      }
      if (_data.verticesDirty() || !_vertices) {
        _vertices = SkVertices::MakeCopy(SkVertices::kTriangles_VertexMode,
                                         static_cast<int>(_data.vertexCount()),
                                         _data.positions(), _data.texCoords(),
                                         _data.colors());
        _data.clearVerticesDirty();
      }
      vertices = _vertices;
      shader = _shader;
    }
    if (!vertices || !shader) {
      return;
    }
    SkPaint realPaint = paint != nullptr ? *paint : SkPaint();
    realPaint.setStyle(SkPaint::kFill_Style);
    realPaint.setPathEffect(nullptr);
    realPaint.setMaskFilter(nullptr);
    realPaint.setShader(std::move(shader));
    canvas->drawVertices(vertices, SkBlendMode::kModulate, realPaint);
  }

private:
  float nonZeroScale(float deviceScale) const {
    if (_fixedScale > 0) {
      return _fixedScale;
    }
    if (_data.laidOut() && _data.rasterScale() > 0) {
      return _data.rasterScale();
    }
    return deviceScale > 0 && std::isfinite(deviceScale) ? deviceScale : 1.0f;
  }

  // Called with the mutex held.
  void rasterize(float scale) {
    _data.layout(scale);
    const auto w = _data.atlasWidth();
    const auto h = _data.atlasHeight();
    auto pixels = SkData::MakeUninitialized(static_cast<size_t>(w) * h * 4);
    _data.rasterize(static_cast<uint8_t *>(pixels->writable_data()));
    auto info =
        SkImageInfo::Make(w, h, kRGBA_8888_SkColorType, kPremul_SkAlphaType);
    auto image = SkImages::RasterFromData(info, std::move(pixels), w * 4);
    _shader = image ? image->makeShader(SkTileMode::kClamp, SkTileMode::kClamp,
                                        SkSamplingOptions(SkFilterMode::kLinear,
                                                          SkMipmapMode::kNone))
                    : nullptr;
    _vertices = nullptr;
  }

  std::mutex _mutex;
  ShapeBlobData _data;
  const float _fixedScale;
  sk_sp<SkVertices> _vertices;
  sk_sp<SkShader> _shader;
};

} // namespace RNSkia
