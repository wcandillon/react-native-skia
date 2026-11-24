// Host-side check of RNSkia::writeAtlasTriangles, built against the Skia
// headers only (see run.sh). SkRSXform::toQuad lives in Skia's sources, so it
// is reimplemented below with the arithmetic of src/core/SkRSXform.cpp.
// drawAtlasAsVertices needs SkVertices::Builder and a canvas, which cannot be
// made without Skia: the checks cover the triangles it hands to Skia.

#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <vector>

#include "include/private/SkLog.h"
#include "rnskia/RNSkAtlas.h"

// Skia symbols the header references but this check never reaches.
void SkLog(SkLogPriority, const char[], ...) {}
void sk_abort_no_print() { std::abort(); }

void SkRSXform::toQuad(SkScalar width, SkScalar height, SkPoint quad[4]) const {
  const SkScalar m00 = fSCos;
  const SkScalar m01 = -fSSin;
  const SkScalar m02 = fTx;
  const SkScalar m10 = -m01;
  const SkScalar m11 = m00;
  const SkScalar m12 = fTy;
  quad[0].set(m02, m12);
  quad[1].set(m00 * width + m02, m10 * width + m12);
  quad[2].set(m00 * width + m01 * height + m02,
              m10 * width + m11 * height + m12);
  quad[3].set(m01 * height + m02, m11 * height + m12);
}

static int fail(const char *message) {
  std::fprintf(stderr, "FAIL: %s\n", message);
  return 1;
}

static bool samePoints(const std::vector<SkPoint> &actual,
                       const std::vector<SkPoint> &expected) {
  if (actual.size() != expected.size()) {
    return false;
  }
  for (size_t i = 0; i < actual.size(); i++) {
    if (std::fabs(actual[i].x() - expected[i].x()) > 1e-4f ||
        std::fabs(actual[i].y() - expected[i].y()) > 1e-4f) {
      return false;
    }
  }
  return true;
}

int main() {
  using RNSkia::kAtlasVerticesPerSprite;
  using RNSkia::writeAtlasTriangles;

  // Two sprites. The first is only translated. The second is rotated by 90
  // degrees and scaled by 2 (scos = 0, ssin = 2).
  const SkRSXform xform[] = {SkRSXform::Make(1, 0, 10, 20),
                             SkRSXform::Make(0, 2, 100, 100)};
  const SkRect tex[] = {SkRect::MakeXYWH(0, 0, 4, 3),
                        SkRect::MakeXYWH(4, 0, 5, 6)};
  const SkColor colors[] = {SK_ColorRED, SK_ColorBLUE};
  const size_t vertexCount = 2 * kAtlasVerticesPerSprite;

  std::vector<SkPoint> positions(vertexCount);
  std::vector<SkPoint> texCoords(vertexCount);
  std::vector<SkColor> vertexColors(vertexCount, SK_ColorTRANSPARENT);
  writeAtlasTriangles({xform, 2}, {tex, 2}, {colors, 2}, positions.data(),
                      texCoords.data(), vertexColors.data());

  // Each sprite's rectangle is transformed by its RSXform, then written as
  // the triangles (0, 1, 2) and (0, 2, 3) of its quad, like
  // SkDevice::drawAtlas.
  if (!samePoints(positions, {{10, 20},
                              {14, 20},
                              {14, 23},
                              {10, 20},
                              {14, 23},
                              {10, 23},
                              {100, 100},
                              {100, 110},
                              {88, 110},
                              {100, 100},
                              {88, 110},
                              {88, 100}})) {
    return fail("positions are not the transformed sprite rectangles as two "
                "triangles");
  }
  // The texture coordinates are the sprite's rectangle in the atlas, in the
  // same triangle order.
  if (!samePoints(texCoords, {{0, 0},
                              {4, 0},
                              {4, 3},
                              {0, 0},
                              {4, 3},
                              {0, 3},
                              {4, 0},
                              {9, 0},
                              {9, 6},
                              {4, 0},
                              {9, 6},
                              {4, 6}})) {
    return fail("texture coordinates are not the sprite rectangles as two "
                "triangles");
  }
  // Each sprite's color is repeated for its six vertices.
  for (size_t i = 0; i < vertexCount; i++) {
    if (vertexColors[i] != colors[i / kAtlasVerticesPerSprite]) {
      return fail("a sprite's color is not repeated for its six vertices");
    }
  }

  // Without colors, the vertex colors are left alone, whether or not storage
  // is given for them.
  std::vector<SkColor> untouched(vertexCount, SK_ColorGREEN);
  writeAtlasTriangles({xform, 2}, {tex, 2}, {}, positions.data(),
                      texCoords.data(), untouched.data());
  for (SkColor color : untouched) {
    if (color != SK_ColorGREEN) {
      return fail("vertex colors are written without sprite colors");
    }
  }
  writeAtlasTriangles({xform, 2}, {tex, 2}, {colors, 2}, positions.data(),
                      texCoords.data(), nullptr);

  // An empty atlas writes nothing.
  writeAtlasTriangles({}, {}, {}, nullptr, nullptr, nullptr);

  std::printf("AtlasTest: passed\n");
  return 0;
}
