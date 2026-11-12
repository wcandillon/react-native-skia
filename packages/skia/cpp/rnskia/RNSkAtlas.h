#pragma once

#include <algorithm>
#include <cstddef>
#include <cstdint>

#include "include/core/SkBlendMode.h"
#include "include/core/SkCanvas.h"
#include "include/core/SkColor.h"
#include "include/core/SkImage.h"
#include "include/core/SkMaskFilter.h"
#include "include/core/SkPaint.h"
#include "include/core/SkPathEffect.h"
#include "include/core/SkPoint.h"
#include "include/core/SkRSXform.h"
#include "include/core/SkRect.h"
#include "include/core/SkSamplingOptions.h"
#include "include/core/SkShader.h"
#include "include/core/SkSpan.h"
#include "include/core/SkTileMode.h"
#include "include/core/SkVertices.h"

namespace RNSkia {

// Skia Graphite has no batched atlas renderer. Its drawAtlas, added in m152
// (before that Graphite's override was empty and an atlas drew nothing),
// records one rectangle draw per sprite. Graphite merges the sprites into one
// instanced draw when they share a paint, but each sprite color is its own
// block of paint uniforms: on the backends without storage buffers (Dawn over
// Vulkan and OpenGL ES, so Android) that is a draw call per distinct color,
// and the recording cost is per sprite on every platform.
// These helpers take the path of SkDevice::drawAtlas instead, the generic
// implementation for devices without an atlas renderer: the sprites become one
// SkVertices, drawn in a single drawVertices call with the paint handled as
// SkCanvas::drawAtlas handles it. This is close to what Ganesh did in v2, where
// DrawAtlasOp packed every sprite into one vertex buffer and drew it once. The
// only difference with Graphite's loop is that sprite edges are not
// anti-aliased, as in v2 (Ganesh).

// Each sprite is written as two triangles.
inline constexpr size_t kAtlasVerticesPerSprite = 6;

// Writes a quad as the triangles (0, 1, 2) and (0, 2, 3), in the order
// SkDevice::drawAtlas uses, and returns the next write position.
inline SkPoint *writeQuadAsTriangles(SkPoint *tris, const SkPoint quad[4]) {
  tris[0] = quad[0];
  tris[1] = quad[1];
  tris[2] = quad[2];
  tris[3] = quad[0];
  tris[4] = quad[2];
  tris[5] = quad[3];
  return tris + kAtlasVerticesPerSprite;
}

// Writes the triangles of the sprites: `positions` receives each sprite's
// rectangle transformed by its RSXform, `texCoords` its rectangle in the
// atlas. Both must hold kAtlasVerticesPerSprite * xform.size() points. When
// `colors` is not empty and `vertexColors` is not null, each sprite's color is
// repeated for its six vertices. `tex` must have the size of `xform`, and
// `colors` must be empty or of that size.
inline void writeAtlasTriangles(SkSpan<const SkRSXform> xform,
                                SkSpan<const SkRect> tex,
                                SkSpan<const SkColor> colors,
                                SkPoint *positions, SkPoint *texCoords,
                                SkColor *vertexColors) {
  const bool hasColors = !colors.empty() && vertexColors != nullptr;
  for (size_t i = 0; i < xform.size(); i++) {
    SkPoint quad[4];
    xform[i].toQuad(tex[i].width(), tex[i].height(), quad);
    positions = writeQuadAsTriangles(positions, quad);
    tex[i].toQuad(quad);
    texCoords = writeQuadAsTriangles(texCoords, quad);
    if (hasColors) {
      vertexColors =
          std::fill_n(vertexColors, kAtlasVerticesPerSprite, colors[i]);
    }
  }
}

// Draws the sprites of `atlas` as a single drawVertices call, with the
// semantics of SkCanvas::drawAtlas: the paint is drawn filled, without path
// effect or mask filter, and its shader is replaced by the atlas sampled with
// `sampling`. When `colors` is not empty, `mode` blends each sprite's color
// with the atlas. Nothing is drawn when the spans are empty or their sizes do
// not match.
inline void drawAtlasAsVertices(SkCanvas *canvas, const SkImage *atlas,
                                SkSpan<const SkRSXform> xform,
                                SkSpan<const SkRect> tex,
                                SkSpan<const SkColor> colors, SkBlendMode mode,
                                const SkSamplingOptions &sampling,
                                const SkPaint *paint) {
  if (canvas == nullptr || atlas == nullptr || xform.empty() ||
      tex.size() != xform.size() ||
      (!colors.empty() && colors.size() != xform.size())) {
    return;
  }
  const bool hasColors = !colors.empty();
  uint32_t flags = SkVertices::kHasTexCoords_BuilderFlag;
  if (hasColors) {
    flags |= SkVertices::kHasColors_BuilderFlag;
  }
  const int vertexCount =
      static_cast<int>(kAtlasVerticesPerSprite * xform.size());
  SkVertices::Builder builder(SkVertices::kTriangles_VertexMode, vertexCount, 0,
                              flags);
  if (!builder.isValid()) {
    return;
  }
  writeAtlasTriangles(xform, tex, colors, builder.positions(),
                      builder.texCoords(),
                      hasColors ? builder.colors() : nullptr);

  SkPaint realPaint = paint != nullptr ? *paint : SkPaint();
  realPaint.setStyle(SkPaint::kFill_Style);
  realPaint.setPathEffect(nullptr);
  realPaint.setMaskFilter(nullptr);
  realPaint.setShader(
      atlas->makeShader(SkTileMode::kClamp, SkTileMode::kClamp, sampling));
  canvas->drawVertices(builder.detach(), mode, realPaint);
}

} // namespace RNSkia
