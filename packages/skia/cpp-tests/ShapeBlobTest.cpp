// Host-side check of RNSkia::ShapeBlobData (the CPU side of Skia.ShapeBlob),
// built against the Skia headers only (see run.sh). RNSkShapeBlob itself
// needs SkVertices, SkImage and a canvas, which cannot be made without Skia:
// the checks cover the atlas layout, the sprite pixels, the vertices handed
// to drawVertices and the raster scale policy.

#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <vector>

#include "include/private/SkLog.h"
#include "rnskia/RNSkShapeBlob.h"

// Skia symbols the header references but this check never reaches.
void SkLog(SkLogPriority, const char[], ...) {}
void sk_abort_no_print() { std::abort(); }

using RNSkia::kShapeBlobVerticesPerShape;
using RNSkia::shapeBlobCoverage;
using RNSkia::ShapeBlobData;
using RNSkia::shapeBlobDeviceScale;
using RNSkia::ShapeBlobKind;

static int failures = 0;

static void check(bool condition, const char *message) {
  if (!condition) {
    std::fprintf(stderr, "FAIL: %s\n", message);
    failures++;
  }
}

static bool near(float a, float b, float eps = 1e-4f) {
  return std::fabs(a - b) <= eps;
}

int main() {
  // Coverage. A rectangle covers whole pixels inside and the exact area of
  // its fractional edges.
  check(near(shapeBlobCoverage(ShapeBlobKind::kRect, 2.5f, 2.5f, 0, 0, 1.25f,
                               1.25f, 1, 1),
             0.75f * 0.75f),
        "rect corner pixel covers the overlap area");
  check(near(shapeBlobCoverage(ShapeBlobKind::kRect, 2.5f, 2.5f, 0, 0, 1.25f,
                               1.25f, 2, 2),
             1.0f),
        "rect inner pixel is fully covered");
  check(shapeBlobCoverage(ShapeBlobKind::kRect, 2, 2, 0, 0, 1, 1, 3, 3) == 0,
        "rect margin is transparent");
  // A circle of radius 5 in a 12 px cell: the center is covered, the corner
  // is not, a pixel on the edge is half covered.
  check(
      near(shapeBlobCoverage(ShapeBlobKind::kCircle, 10, 10, 0, 0, 1, 1, 5, 5),
           1.0f),
      "circle center is covered");
  check(shapeBlobCoverage(ShapeBlobKind::kCircle, 10, 10, 0, 0, 1, 1, 0, 0) ==
            0,
        "circle cell corner is transparent");
  // With the center at (6.5, 6.5), the center of the pixel (11, 6) is at
  // distance 5, on the edge.
  check(near(shapeBlobCoverage(ShapeBlobKind::kCircle, 10, 10, 0, 0, 1.5f, 1.5f,
                               11, 6),
             0.5f),
        "circle edge pixel is half covered");
  // A rounded rectangle is a rectangle along its edges and a circle in its
  // corners; with zero radii it is the rectangle.
  check(
      near(shapeBlobCoverage(ShapeBlobKind::kRRect, 20, 10, 4, 4, 1, 1, 10, 1),
           1.0f),
      "rrect edge pixel is covered");
  check(shapeBlobCoverage(ShapeBlobKind::kRRect, 20, 10, 4, 4, 1, 1, 1, 1) <
            0.2f,
        "rrect corner pixel is mostly outside");
  check(near(shapeBlobCoverage(ShapeBlobKind::kRRect, 2.5f, 2.5f, 0, 0, 1.25f,
                               1.25f, 1, 1),
             0.75f * 0.75f),
        "rrect without radii is a rect");

  // Device scale: rotation does not change it, a scale does.
  check(near(shapeBlobDeviceScale(3, 0, 0, 3), 3), "scale 3");
  const float cs = 3 * std::cos(0.6f);
  const float sn = 3 * std::sin(0.6f);
  check(near(shapeBlobDeviceScale(cs, -sn, sn, cs), 3),
        "rotation keeps the scale");
  check(near(shapeBlobDeviceScale(2, 0, 0, 1), 2), "largest axis scale");
  check(near(shapeBlobDeviceScale(1, 1, 0, 1), 1.618034f),
        "skew: largest singular value");

  // Layout, matched against the benchmark's hand-built atlas: a sprite of S
  // logical units at pixel ratio R is a cell of ceil(S * R) + 2 pixels with
  // the shape centered in it; a rectangle's quad starts at its top-left minus
  // the margin, a circle's at its center minus half a cell.
  const float R = 2.625f;
  const float S = 411.42857f / 80 - 1;
  ShapeBlobData data;
  const int a =
      data.addShape(ShapeBlobKind::kRect, 10, 20, S, S, 0, 0, 0xFF00FF00);
  const int b =
      data.addShape(ShapeBlobKind::kCircle, 40, 50, S, S, 0, 0, 0xFFFF0000);
  const int c =
      data.addShape(ShapeBlobKind::kRect, 70, 20, S, S, 0, 0, 0xFF0000FF);
  check(a == 0 && b == 1 && c == 2, "indices in insertion order");
  check(data.sprites().size() == 2, "same kind and size share a sprite");
  check(!data.laidOut(), "no layout before the first draw");
  check(near(data.scaleToRasterize(R, 0), R), "first draw rasterizes");
  data.layout(R);
  const float cellPx = std::ceil(S * R) + 2;
  const float margin = (cellPx - S * R) / 2;
  check(data.atlasWidth() == 2 * cellPx && data.atlasHeight() == cellPx,
        "two cells side by side");
  check(data.vertexCount() == 3 * kShapeBlobVerticesPerShape,
        "six vertices per shape");
  const SkPoint *p = data.positions();
  const SkPoint *t = data.texCoords();
  check(near(p[0].x(), 10 - margin / R) && near(p[0].y(), 20 - margin / R),
        "rect quad top-left");
  check(near(p[2].x(), 10 - margin / R + cellPx / R), "rect quad right");
  const SkPoint *pc = p + kShapeBlobVerticesPerShape;
  check(near(pc[0].x(), 40 - cellPx / 2 / R) &&
            near(pc[0].y(), 50 - cellPx / 2 / R),
        "circle quad top-left");
  check(near(t[0].x(), 0) && near(t[2].x(), cellPx) && near(t[2].y(), cellPx),
        "rect texture cell");
  const SkPoint *tc = t + kShapeBlobVerticesPerShape;
  check(near(tc[0].x(), cellPx) && near(tc[2].x(), 2 * cellPx),
        "circle texture cell");
  check(data.colors()[kShapeBlobVerticesPerShape * 2 + 5] == 0xFF0000FF,
        "vertex colors");

  // The pixels: white, premultiplied, alpha = coverage.
  std::vector<uint8_t> pixels(data.atlasWidth() * data.atlasHeight() * 4);
  data.rasterize(pixels.data());
  const int mid = static_cast<int>(cellPx / 2);
  const uint8_t *center = &pixels[(mid * data.atlasWidth() + mid) * 4];
  check(center[0] == 255 && center[3] == 255, "sprite center is opaque white");
  check(pixels[3] == 0, "atlas corner is transparent");
  for (size_t i = 0; i < pixels.size(); i += 4) {
    if (pixels[i] != pixels[i + 3] || pixels[i + 1] != pixels[i + 3] ||
        pixels[i + 2] != pixels[i + 3]) {
      check(false, "premultiplied white");
      break;
    }
  }

  // setPosition patches the six vertices of one shape only.
  data.clearVerticesDirty();
  check(data.setPosition(1, 100, 200), "setPosition in range");
  check(!data.setPosition(3, 0, 0), "setPosition out of range");
  check(data.verticesDirty(), "setPosition marks the vertices dirty");
  check(near(pc[0].x(), 100 - cellPx / 2 / R) &&
            near(pc[5].y(), 200 + cellPx / 2 / R),
        "moved circle quad");
  check(near(p[0].x(), 10 - margin / R), "other shapes stay");
  check(data.setColor(0, 0x80FFFFFF) && data.colors()[3] == 0x80FFFFFF,
        "setColor");

  // Raster scale policy: inside [0.75, 1.5] of the atlas scale nothing is
  // rasterized again; outside it is; a fixed scale never changes.
  check(data.scaleToRasterize(R * 1.4f, 0) == 0, "small zoom keeps the atlas");
  check(data.scaleToRasterize(R * 0.8f, 0) == 0, "small unzoom keeps it");
  check(near(data.scaleToRasterize(R * 1.6f, 0), R * 1.6f), "zoom rasterizes");
  check(near(data.scaleToRasterize(R * 0.7f, 0), R * 0.7f),
        "unzoom rasterizes");
  check(data.scaleToRasterize(R * 4, R) == 0, "fixed scale never rasterizes");
  check(data.scaleToRasterize(-1, 0) == 0, "perspective keeps the atlas");

  // A new sprite after the layout asks for a new atlas; one more instance of
  // a known sprite is written in place.
  data.addShape(ShapeBlobKind::kRect, 0, 0, S, S, 0, 0, 0xFF000000);
  check(data.laidOut(), "known sprite keeps the layout");
  check(near(data.positions()[3 * kShapeBlobVerticesPerShape].x(), -margin / R),
        "known sprite written in place");
  data.addShape(ShapeBlobKind::kRRect, 0, 0, 30, 10, 3, 3, 0xFF000000);
  check(!data.laidOut() && data.spritesDirty(), "new sprite needs an atlas");
  check(near(data.scaleToRasterize(R, 0), R), "and rasterizes");

  // Huge sprites lower the raster scale.
  ShapeBlobData big;
  big.addShape(ShapeBlobKind::kCircle, 0, 0, 4000, 4000, 0, 0, 0xFF000000);
  check(near(big.layout(1), RNSkia::kShapeBlobMaxSpritePixels / 4000.0f),
        "sprite size is capped");

  if (failures > 0) {
    return 1;
  }
  std::printf("ShapeBlobTest: ok\n");
  return 0;
}
