#pragma once

#include <optional>

#include "Command.h"
#include "Convertor.h"
#include "DrawingCtx.h"
#include "ImageFit.h"

namespace RNSkia {

struct CircleCmdProps {
  std::optional<float> cx;
  std::optional<float> cy;
  std::optional<SkPoint> c;
  float r;
};

class CircleCmd : public Command {
private:
  CircleCmdProps props;

public:
  CircleCmd(jsi::Runtime &runtime, const jsi::Object &object,
            Variables &variables)
      : Command(CommandType::DrawCircle) {
    convertProperty(runtime, object, "cx", props.cx, variables);
    convertProperty(runtime, object, "cy", props.cy, variables);
    convertProperty(runtime, object, "c", props.c, variables);
    convertProperty(runtime, object, "r", props.r, variables);
  }

  void draw(DrawingCtx *ctx) {
    auto paint = ctx->getPaint();
    if (props.c.has_value()) {
      ctx->canvas->drawCircle(props.c.value(), props.r, paint);
    } else {
      auto cx = props.cx.value_or(0);
      auto cy = props.cy.value_or(0);
      auto r = props.r;
      ctx->canvas->drawCircle(cx, cy, r, paint);
    }
  }
};

struct RectCmdProps {
  float x = 0;
  float y = 0;
  std::optional<float> width;
  std::optional<float> height;
  std::optional<SkRect> rect;
};

class RectCmd : public Command {
private:
  RectCmdProps props;

public:
  RectCmd(jsi::Runtime &runtime, const jsi::Object &object,
          Variables &variables)
      : Command(CommandType::DrawRect) {
    convertProperty(runtime, object, "x", props.x, variables);
    convertProperty(runtime, object, "y", props.y, variables);
    convertProperty(runtime, object, "width", props.width, variables);
    convertProperty(runtime, object, "height", props.height, variables);
    convertProperty(runtime, object, "rect", props.rect, variables);
  }

  void draw(DrawingCtx *ctx) {
    auto [x, y, width, height, rect] = props;
    if (rect.has_value()) {
      ctx->canvas->drawRect(rect.value(), ctx->getPaint());
    } else {
      auto rct = SkRect::MakeXYWH(x, y, width.value(), height.value());
      ctx->canvas->drawRect(rct, ctx->getPaint());
    }
  }
};

struct PathCmdProps {
  SkPath path;
  float start;
  float end;
  std::optional<StrokeOpts> stroke;
  std::optional<SkPathFillType> fillType;
};

class PathCmd : public Command {
private:
  PathCmdProps props;

public:
  PathCmd(jsi::Runtime &runtime, const jsi::Object &object,
          Variables &variables)
      : Command(CommandType::DrawPath) {
    convertProperty(runtime, object, "path", props.path, variables);
    convertProperty(runtime, object, "start", props.start, variables);
    convertProperty(runtime, object, "end", props.end, variables);
    convertProperty(runtime, object, "stroke", props.stroke, variables);
    convertProperty(runtime, object, "fillType", props.fillType, variables);
  }

  void draw(DrawingCtx *ctx) {
    // Saturate start and end values (clamp between 0 and 1)
    float start = std::clamp(props.start, 0.0f, 1.0f);
    float end = std::clamp(props.end, 0.0f, 1.0f);

    // Check conditions that require path mutation
    bool hasStartOffset = start != 0.0f;
    bool hasEndOffset = end != 1.0f;
    bool hasStrokeOptions = props.stroke.has_value();
    bool hasFillType = props.fillType.has_value();
    bool willMutatePath =
        hasStartOffset || hasEndOffset || hasStrokeOptions || hasFillType;

    std::shared_ptr<const SkPath> pathToUse;

    if (willMutatePath) {
      // Create a filtered path for modifications
      SkPath filteredPath(props.path);

      // Handle path trimming
      if (hasStartOffset || hasEndOffset) {
        auto pe =
            SkTrimPathEffect::Make(start, end, SkTrimPathEffect::Mode::kNormal);
        if (pe != nullptr) {
          SkStrokeRec rec(SkStrokeRec::InitStyle::kHairline_InitStyle);
          if (!pe->filterPath(&filteredPath, filteredPath, &rec, nullptr)) {
            throw std::runtime_error(
                "Failed trimming path with parameters start: " +
                std::to_string(start) + ", end: " + std::to_string(end));
          }
          filteredPath.swap(filteredPath);
        } else {
          throw std::runtime_error(
              "Failed trimming path with parameters start: " +
              std::to_string(start) + ", end: " + std::to_string(end));
        }
      }

      // Set fill type
      auto p = std::make_shared<SkPath>(filteredPath);
      if (props.fillType.has_value()) {
        p->setFillType(props.fillType.value());
      }
      // Handle stroke options
      if (hasStrokeOptions) {
        const auto &stroke = props.stroke.value();
        SkPaint strokePaint;

        if (stroke.cap.has_value()) {
          strokePaint.setStrokeCap(stroke.cap.value());
        }

        if (stroke.join.has_value()) {
          strokePaint.setStrokeJoin(stroke.join.value());
        }

        if (stroke.width.has_value()) {
          strokePaint.setStrokeWidth(stroke.width.value());
        }

        if (stroke.miter_limit.has_value()) {
          strokePaint.setStrokeMiter(stroke.miter_limit.value());
        }

        float precision = stroke.precision.value_or(1.0f);

        auto strokedPath = std::make_shared<SkPath>();
        if (!skpathutils::FillPathWithPaint(*p, strokePaint, strokedPath.get(),
                                            nullptr, precision)) {
          throw std::runtime_error("Failed to apply stroke to path");
        }
        pathToUse = std::const_pointer_cast<const SkPath>(strokedPath);
      } else {
        pathToUse = std::const_pointer_cast<const SkPath>(p);
      }
    } else {
      // Use the original path directly
      pathToUse = std::make_shared<const SkPath>(props.path);
    }

    if (!pathToUse) {
      throw std::runtime_error(
          "Path node could not resolve path props correctly.");
    }

    // Draw the final path
    ctx->canvas->drawPath(*pathToUse, ctx->getPaint());
  }
};

struct LineCmdProps {
  SkPoint p1;
  SkPoint p2;
};

class LineCmd : public Command {
private:
  LineCmdProps props;

public:
  LineCmd(jsi::Runtime &runtime, const jsi::Object &object,
          Variables &variables)
      : Command(CommandType::DrawLine) {
    convertProperty(runtime, object, "p1", props.p1, variables);
    convertProperty(runtime, object, "p2", props.p2, variables);
  }

  void draw(DrawingCtx *ctx) {
    ctx->canvas->drawLine(props.p1.x(), props.p1.y(), props.p2.x(),
                          props.p2.y(), ctx->getPaint());
  }
};

struct TextPathProps {
  std::optional<SkFont> font;
  std::string text;
  SkPath path;
  float initialOffset;
};

class TextPathCmd : public Command {
private:
  TextPathProps props;

public:
  TextPathCmd(jsi::Runtime &runtime, const jsi::Object &object,
              Variables &variables)
      : Command(CommandType::DrawTextPath) {
    convertProperty(runtime, object, "font", props.font, variables);
    convertProperty(runtime, object, "text", props.text, variables);
    convertProperty(runtime, object, "path", props.path, variables);
    convertProperty(runtime, object, "initialOffset", props.initialOffset,
                    variables);
  }

  void draw(DrawingCtx *ctx) {
    auto [font, text, path, initialOffset] = props;
    if (font.has_value()) {
      // Get glyphs
      auto numGlyphIds =
          font->countText(text.c_str(), text.length(), SkTextEncoding::kUTF8);

      std::vector<SkGlyphID> glyphIds;
      glyphIds.reserve(numGlyphIds);
      auto ids = font->textToGlyphs(
          text.c_str(), text.length(), SkTextEncoding::kUTF8,
          static_cast<SkGlyphID *>(glyphIds.data()), numGlyphIds);

      // Get glyph widths
      int glyphsSize = static_cast<int>(ids);
      std::vector<SkScalar> widthPtrs;
      widthPtrs.resize(glyphsSize);
      font->getWidthsBounds(glyphIds.data(), numGlyphIds,
                            static_cast<SkScalar *>(widthPtrs.data()), nullptr,
                            nullptr); // TODO: Should we use paint somehow here?

      std::vector<SkRSXform> rsx;
      SkContourMeasureIter meas(path, false, 1);

      auto cont = meas.next();
      auto dist = initialOffset;

      for (size_t i = 0; i < text.length() && cont != nullptr; ++i) {
        auto width = widthPtrs[i];
        dist += width / 2;
        if (dist > cont->length()) {
          // jump to next contour
          cont = meas.next();
          if (cont == nullptr) {
            // We have come to the end of the path - terminate the string
            // right here.
            text = text.substr(0, i);
            break;
          }
          dist = width / 2;
        }
        // Gives us the (x, y) coordinates as well as the cos/sin of the
        // tangent line at that position.
        SkPoint pos;
        SkVector tan;
        if (!cont->getPosTan(dist, &pos, &tan)) {
          throw std::runtime_error(
              "Could not calculate distance when resolving text path");
        }
        auto px = pos.x();
        auto py = pos.y();
        auto tx = tan.x();
        auto ty = tan.y();

        auto adjustedX = px - (width / 2) * tx;
        auto adjustedY = py - (width / 2) * ty;

        rsx.push_back(SkRSXform::Make(tx, ty, adjustedX, adjustedY));
        dist += width / 2;
      }

      auto blob = SkTextBlob::MakeFromRSXform(text.c_str(), text.length(),
                                              rsx.data(), *font);
      ctx->canvas->drawTextBlob(blob, 0, 0, ctx->getPaint());
    }
  }
};

struct TextCmdProps {
  std::optional<SkFont> font;
  std::string text;
  float x;
  float y;
};

class TextCmd : public Command {
private:
  TextCmdProps props;

public:
  TextCmd(jsi::Runtime &runtime, const jsi::Object &object,
          Variables &variables)
      : Command(CommandType::DrawText) {
    convertProperty(runtime, object, "font", props.font, variables);
    convertProperty(runtime, object, "text", props.text, variables);
    convertProperty(runtime, object, "x", props.x, variables);
    convertProperty(runtime, object, "y", props.y, variables);
  }

  void draw(DrawingCtx *ctx) {
    auto [font, text, x, y] = props;
    auto paint = ctx->getPaint();
    if (font.has_value()) {
      ctx->canvas->drawSimpleText(text.c_str(), text.length(),
                                  SkTextEncoding::kUTF8, x, y, font.value(),
                                  paint);
    }
  }
};

// Add to Drawings.h after existing command structures
struct BoxShadowCmdProps {
  float dx = 0;
  float dy = 0;
  float spread = 0;
  float blur = 0;
  std::optional<SkColor> color;
  std::optional<bool> inner;
};

struct BoxCmdProps {
  std::variant<SkRect, SkRRect> box;
};

class BoxCmd : public Command {
private:
  BoxCmdProps props;
  std::vector<BoxShadowCmdProps> shadows;

  // Helper function to inflate RRect (deflate is just negative inflation)
  SkRRect inflate(const SkRRect &box, float dx, float dy, float tx = 0,
                  float ty = 0) {
    const auto &rect = box.rect();
    SkRect newRect =
        SkRect::MakeXYWH(rect.x() - dx + tx, rect.y() - dy + ty,
                         rect.width() + 2 * dx, rect.height() + 2 * dy);

    SkRRect result;
    result.setRectXY(newRect, box.radii()[0].fX + dx, box.radii()[0].fY + dy);
    return result;
  }

  SkRRect deflate(const SkRRect &box, float dx, float dy, float tx = 0,
                  float ty = 0) {
    return inflate(box, -dx, -dy, tx, ty);
  }

public:
  BoxCmd(jsi::Runtime &runtime, const jsi::Object &object,
         const jsi::Array &shadowsArray, Variables &variables)
      : Command(CommandType::DrawBox) {

    convertProperty(runtime, object, "box", props.box, variables);
    size_t shadowCount = shadowsArray.size(runtime);
    shadows.reserve(shadowCount);

    for (size_t i = 0; i < shadowCount; i++) {
      auto shadowObj =
          shadowsArray.getValueAtIndex(runtime, i).asObject(runtime);
      BoxShadowCmdProps shadow;

      convertProperty(runtime, shadowObj, "dx", shadow.dx, variables);
      convertProperty(runtime, shadowObj, "dy", shadow.dy, variables);
      convertProperty(runtime, shadowObj, "spread", shadow.spread, variables);
      convertProperty(runtime, shadowObj, "blur", shadow.blur, variables);
      convertProperty(runtime, shadowObj, "color", shadow.color, variables);
      convertProperty(runtime, shadowObj, "inner", shadow.inner, variables);

      shadows.push_back(shadow);
    }
  }

  void draw(DrawingCtx *ctx) {

    // Get current paint properties
    auto paint = ctx->getPaint();
    float opacity = paint.getAlphaf();

    // Convert box to RRect if needed
    SkRRect box;
    if (std::holds_alternative<SkRect>(props.box)) {
      auto rect = std::get<SkRect>(props.box);
      box.setRectXY(rect, 0, 0);
    } else {
      box = std::get<SkRRect>(props.box);
    }

    // Draw outer shadows first
    for (const auto &shadow : shadows) {
      if (!shadow.inner.value_or(false)) {
        SkPaint shadowPaint;
        shadowPaint.setAntiAlias(true);
        shadowPaint.setColor(shadow.color.value_or(SK_ColorBLACK));
        shadowPaint.setAlphaf(opacity * shadowPaint.getAlphaf());
        shadowPaint.setMaskFilter(SkMaskFilter::MakeBlur(
            SkBlurStyle::kNormal_SkBlurStyle, shadow.blur, true));

        auto shadowBox =
            inflate(box, shadow.spread, shadow.spread, shadow.dx, shadow.dy);
        ctx->canvas->drawRRect(shadowBox, shadowPaint);
      }
    }

    // Draw main box
    ctx->canvas->drawRRect(box, paint);

    // Draw inner shadows
    for (const auto &shadow : shadows) {
      if (shadow.inner.value_or(false)) {
        ctx->canvas->save();

        // Clip to box bounds
        ctx->canvas->clipRRect(box, SkClipOp::kIntersect, true);

        SkPaint shadowPaint;
        shadowPaint.setAntiAlias(true);
        shadowPaint.setColor(shadow.color.value_or(SK_ColorBLACK));
        shadowPaint.setAlphaf(opacity * shadowPaint.getAlphaf());
        shadowPaint.setMaskFilter(SkMaskFilter::MakeBlur(
            SkBlurStyle::kNormal_SkBlurStyle, shadow.blur, true));

        // Calculate shadow bounds
        float delta = 10 + std::max(std::abs(shadow.dx), std::abs(shadow.dy));
        auto inner =
            deflate(box, shadow.spread, shadow.spread, shadow.dx, shadow.dy);
        auto outer = inflate(box, delta, delta);

        ctx->canvas->drawDRRect(outer, inner, shadowPaint);
        ctx->canvas->restore();
      }
    }
  }
};

struct ImageCmdProps {
  float x = 0;
  float y = 0;
  std::optional<float> width;
  std::optional<float> height;
  std::optional<SkRect> rect;
  std::string fit;
  std::optional<sk_sp<SkImage>> image;
  std::optional<SkSamplingOptions> sampling;
};

class ImageCmd : public Command {
private:
  ImageCmdProps props;

public:
  ImageCmd(jsi::Runtime &runtime, const jsi::Object &object,
           Variables &variables)
      : Command(CommandType::DrawImage) {
    convertProperty(runtime, object, "rect", props.rect, variables);
    convertProperty(runtime, object, "image", props.image, variables);
    convertProperty(runtime, object, "sampling", props.sampling, variables);

    convertProperty(runtime, object, "fit", props.fit, variables);
    convertProperty(runtime, object, "x", props.x, variables);
    convertProperty(runtime, object, "y", props.y, variables);
    convertProperty(runtime, object, "width", props.width, variables);
    convertProperty(runtime, object, "height", props.height, variables);
    convertProperty(runtime, object, "rect", props.rect, variables);
  }

  void draw(DrawingCtx *ctx) {
    auto [x, y, width, height, rect, fit, image, sampling] = props;
    if (image.has_value()) {
      auto img = image.value();
      auto hasRect =
          rect.has_value() || (width.has_value() && height.has_value());
      if (hasRect) {
        auto src = SkRect::MakeXYWH(0, 0, img->width(), img->height());
        auto dst = rect.has_value()
                       ? rect.value()
                       : SkRect::MakeXYWH(x, y, width.value(), height.value());
        auto rects = RNSkiaImage::fitRects(fit, src, dst);
        ctx->canvas->drawImageRect(
            img, rects.src, rects.dst,
            sampling.value_or(SkSamplingOptions(SkFilterMode::kLinear)),
            &(ctx->getPaint()), SkCanvas::kStrict_SrcRectConstraint);
      } else {
        throw std::runtime_error(
            "Image node could not resolve image dimension props.");
      }
    }
  }
};

struct PointsCmdProps {
  std::vector<SkPoint> points;
  SkCanvas::PointMode mode;
};

class PointsCmd : public Command {
private:
  PointsCmdProps props;

public:
  PointsCmd(jsi::Runtime &runtime, const jsi::Object &object,
            Variables &variables)
      : Command(CommandType::DrawPoints) {
    convertProperty(runtime, object, "points", props.points, variables);
    convertProperty(runtime, object, "mode", props.mode, variables);
  }

  void draw(DrawingCtx *ctx) {
    ctx->canvas->drawPoints(props.mode, props.points.size(),
                            props.points.data(), ctx->getPaint());
  }
};

struct RRectCmdProps {
  std::optional<SkRRect> rect;
  float x = 0;
  float y = 0;
  std::optional<float> width;
  std::optional<float> height;
  std::optional<Radius> r;
};

class RRectCmd : public Command {
private:
  RRectCmdProps props;

public:
  RRectCmd(jsi::Runtime &runtime, const jsi::Object &object,
           Variables &variables)
      : Command(CommandType::DrawRRect) {
    convertProperty(runtime, object, "rect", props.rect, variables);
    convertProperty(runtime, object, "x", props.x, variables);
    convertProperty(runtime, object, "y", props.y, variables);
    convertProperty(runtime, object, "width", props.width, variables);
    convertProperty(runtime, object, "height", props.height, variables);
    convertProperty(runtime, object, "r", props.r, variables);
  }

  void draw(DrawingCtx *ctx) {
    auto [rect, x, y, width, height, r] = props;
    if (rect.has_value()) {
      ctx->canvas->drawRRect(rect.value(), ctx->getPaint());
    } else {
      if (!width.has_value() || !height.has_value() || !r.has_value()) {
        throw std::runtime_error("Invalid properties for rounded rect");
      }
      auto rct = SkRRect::MakeRectXY(
          SkRect::MakeXYWH(x, y, width.value(), height.value()), r.value().rX,
          r.value().rY);
      ctx->canvas->drawRRect(rct, ctx->getPaint());
    }
  }
};

struct OvalCmdProps {
  std::optional<SkRect> rect;
  float x = 0;
  float y = 0;
  std::optional<float> width;
  std::optional<float> height;
};

class OvalCmd : public Command {
private:
  OvalCmdProps props;

public:
  OvalCmd(jsi::Runtime &runtime, const jsi::Object &object,
          Variables &variables)
      : Command(CommandType::DrawOval) {
    convertProperty(runtime, object, "x", props.x, variables);
    convertProperty(runtime, object, "y", props.y, variables);
    convertProperty(runtime, object, "width", props.width, variables);
    convertProperty(runtime, object, "height", props.height, variables);
    convertProperty(runtime, object, "rect", props.rect, variables);
  }

  void draw(DrawingCtx *ctx) {
    auto [rect, x, y, width, height] = props;
    if (rect.has_value()) {
      ctx->canvas->drawOval(rect.value(), ctx->getPaint());
    } else {
      if (!width.has_value() || !height.has_value()) {
        throw std::runtime_error("Invalid properties received for Oval");
      }
      auto rct = SkRect::MakeXYWH(x, y, width.value(), height.value());
      ctx->canvas->drawOval(rct, ctx->getPaint());
    }
  }
};

struct PatchCmdProps {
  Patch patch;
  std::optional<std::vector<SkColor>> colors;
  std::optional<std::vector<SkPoint>> texture;
  std::optional<SkBlendMode> blendMode;
};

class PatchCmd : public Command {
private:
  PatchCmdProps props;

public:
  PatchCmd(jsi::Runtime &runtime, const jsi::Object &object,
           Variables &variables)
      : Command(CommandType::DrawPatch) {
    convertProperty(runtime, object, "patch", props.patch, variables);
    convertProperty(runtime, object, "colors", props.colors, variables);
    convertProperty(runtime, object, "texture", props.texture, variables);
    convertProperty(runtime, object, "blendMode", props.blendMode, variables);
  }

  void draw(DrawingCtx *ctx) {
    // Validate colors array has exactly 4 colors if provided
    if (props.colors.has_value() && props.colors.value().size() != 4) {
      throw std::invalid_argument("Colors array for patch must have exactly 4 colors");
    }
    
    // Validate texture array has exactly 4 points if provided
    if (props.texture.has_value() && props.texture.value().size() != 4) {
      throw std::invalid_argument("Texture coordinates array for patch must have exactly 4 points");
    }

    // Determine default blend mode based on presence of colors
    SkBlendMode defaultBlendMode = props.colors.has_value()
                                       ? SkBlendMode::kDstOver
                                       : SkBlendMode::kSrcOver;

    ctx->canvas->drawPatch(
        props.patch.data(),
        props.colors.has_value() ? props.colors.value().data() : nullptr,
        props.texture.has_value() ? props.texture.value().data() : nullptr,
        props.blendMode.value_or(defaultBlendMode), ctx->getPaint());
  }
};

struct VerticesCmdProps {
  std::vector<SkPoint> vertices;
  std::optional<std::vector<SkColor>> colors;
  std::optional<std::vector<SkPoint>> textures;
  SkVertices::VertexMode mode;
  std::optional<SkBlendMode> blendMode;
  std::optional<std::vector<uint16_t>> indices;
};

class VerticesCmd : public Command {
private:
  VerticesCmdProps props;

public:
  VerticesCmd(jsi::Runtime &runtime, const jsi::Object &object,
              Variables &variables)
      : Command(CommandType::DrawVertices) {
    convertProperty(runtime, object, "vertices", props.vertices, variables);
    convertProperty(runtime, object, "colors", props.colors, variables);
    convertProperty(runtime, object, "textures", props.textures, variables);
    convertProperty(runtime, object, "mode", props.mode, variables);
    convertProperty(runtime, object, "blendMode", props.blendMode, variables);
    convertProperty(runtime, object, "indices", props.indices, variables);
  }

  void draw(DrawingCtx *ctx) {
    // Validate array sizes
    if (props.colors.has_value() && props.colors.value().size() != props.vertices.size()) {
      throw std::invalid_argument("Colors array must have the same size as vertices array");
    }
    
    if (props.textures.has_value() && props.textures.value().size() != props.vertices.size()) {
      throw std::invalid_argument("Textures array must have the same size as vertices array");
    }

    // Create vertices using MakeCopy
    auto vertices = SkVertices::MakeCopy(
        props.mode, static_cast<int>(props.vertices.size()),
        props.vertices.data(),
        props.textures.has_value() ? props.textures.value().data() : nullptr,
        props.colors.has_value() ? props.colors.value().data() : nullptr,
        props.indices.has_value()
            ? static_cast<int>(props.indices.value().size())
            : 0,
        props.indices.has_value() ? props.indices.value().data() : nullptr);

    // Determine blend mode - use DstOver if colors are provided, SrcOver
    // otherwise
    const auto defaultBlendMode = props.colors.has_value()
                                      ? SkBlendMode::kDstOver
                                      : SkBlendMode::kSrcOver;

    // Draw the vertices with the determined blend mode
    ctx->canvas->drawVertices(
        vertices, props.blendMode.value_or(defaultBlendMode), ctx->getPaint());
  }
};

struct DiffRectCmdProps {
  SkRRect outer;
  SkRRect inner;
};

class DiffRectCmd : public Command {
private:
  DiffRectCmdProps props;

public:
  DiffRectCmd(jsi::Runtime &runtime, const jsi::Object &object,
              Variables &variables)
      : Command(CommandType::DrawDiffRect) {
    convertProperty(runtime, object, "outer", props.outer, variables);
    convertProperty(runtime, object, "inner", props.inner, variables);
  }

  void draw(DrawingCtx *ctx) {
    ctx->canvas->drawDRRect(props.outer, props.inner, ctx->getPaint());
  }
};

struct TextBlobCmdProps {
  sk_sp<SkTextBlob> blob;
  float x;
  float y;
};

class TextBlobCmd : public Command {
private:
  TextBlobCmdProps props;

public:
  TextBlobCmd(jsi::Runtime &runtime, const jsi::Object &object,
              Variables &variables)
      : Command(CommandType::DrawTextBlob) {
    convertProperty(runtime, object, "blob", props.blob, variables);
    convertProperty(runtime, object, "x", props.x, variables);
    convertProperty(runtime, object, "y", props.y, variables);
  }

  void draw(DrawingCtx *ctx) {
    ctx->canvas->drawTextBlob(props.blob, props.x, props.y, ctx->getPaint());
  }
};

struct GlyphsCmdProps {
  std::optional<SkFont> font;
  float x;
  float y;
  GlyphData glyphs;
};

class GlyphsCmd : public Command {
private:
  GlyphsCmdProps props;

public:
  GlyphsCmd(jsi::Runtime &runtime, const jsi::Object &object,
            Variables &variables)
      : Command(CommandType::DrawGlyphs) {
    convertProperty(runtime, object, "font", props.font, variables);
    convertProperty(runtime, object, "x", props.x, variables);
    convertProperty(runtime, object, "y", props.y, variables);
    convertProperty(runtime, object, "glyphs", props.glyphs, variables);
  }

  void draw(DrawingCtx *ctx) {
    if (props.font.has_value()) {
      ctx->canvas->drawGlyphs(
          static_cast<int>(props.glyphs.glyphIds.size()),
          props.glyphs.glyphIds.data(), props.glyphs.positions.data(),
          SkPoint::Make(props.x, props.y), props.font.value(), ctx->getPaint());
    }
  }
};

struct PictureCmdProps {
  sk_sp<SkPicture> picture;
};

class PictureCmd : public Command {
private:
  PictureCmdProps props;

public:
  PictureCmd(jsi::Runtime &runtime, const jsi::Object &object,
             Variables &variables)
      : Command(CommandType::DrawPicture) {
    convertProperty(runtime, object, "picture", props.picture, variables);
  }

  void draw(DrawingCtx *ctx) { ctx->canvas->drawPicture(props.picture); }
};

struct ImageSVGCmdProps {
  sk_sp<SkSVGDOM> svg;
  std::optional<float> x;
  std::optional<float> y;
  std::optional<float> width;
  std::optional<float> height;
  std::optional<SkRect> rect;
};

class ImageSVGCmd : public Command {
private:
  ImageSVGCmdProps props;

public:
  ImageSVGCmd(jsi::Runtime &runtime, const jsi::Object &object,
              Variables &variables)
      : Command(CommandType::DrawImageSVG) {
    // Convert other properties
    convertProperty(runtime, object, "svg", props.svg, variables);
    convertProperty(runtime, object, "x", props.x, variables);
    convertProperty(runtime, object, "y", props.y, variables);
    convertProperty(runtime, object, "width", props.width, variables);
    convertProperty(runtime, object, "height", props.height, variables);
    convertProperty(runtime, object, "rect", props.rect, variables);
  }

  void draw(DrawingCtx *ctx) {
    if (props.svg != nullptr) {
      ctx->canvas->save();

      if (props.rect.has_value()) {
        // If rect is provided, use it for translation and container size
        auto rect = props.rect.value();
        ctx->canvas->translate(rect.x(), rect.y());
        props.svg->setContainerSize(SkSize::Make(rect.width(), rect.height()));
      } else {
        // Otherwise use individual x, y, width, height properties
        float x = props.x.value_or(-1);
        float y = props.y.value_or(-1);
        float width = props.width.value_or(-1);
        float height = props.height.value_or(-1);

        if (x != -1 && y != -1) {
          ctx->canvas->translate(x, y);
        }

        if (width != -1 && height != -1) {
          props.svg->setContainerSize(SkSize::Make(width, height));
        }
      }

      // Render the SVG
      props.svg->render(ctx->canvas);
      ctx->canvas->restore();
    }
  }
};

struct ParagraphCmdProps {
  std::shared_ptr<JsiSkParagraph> paragraph;
  float x;
  float y;
  float width;
};

class ParagraphCmd : public Command {
private:
  ParagraphCmdProps props;

public:
  ParagraphCmd(jsi::Runtime &runtime, const jsi::Object &object,
               Variables &variables)
      : Command(CommandType::DrawParagraph) {
    convertProperty(runtime, object, "paragraph", props.paragraph, variables);
    convertProperty(runtime, object, "x", props.x, variables);
    convertProperty(runtime, object, "y", props.y, variables);
    convertProperty(runtime, object, "width", props.width, variables);
  }

  void draw(DrawingCtx *ctx) {
    if (props.paragraph) {
      auto paragraph = props.paragraph->getObject();
      paragraph->layout(props.width);
      paragraph->paint(ctx->canvas, props.x, props.y);
    }
  }
};

struct AtlasCmdProps {
  sk_sp<SkImage> image;
  std::vector<SkRect> sprites;
  std::vector<SkRSXform> transforms;
  std::optional<std::vector<SkColor>> colors;
  std::optional<SkBlendMode> blendMode;
  std::optional<SkSamplingOptions> sampling;
};

class AtlasCmd : public Command {
private:
  AtlasCmdProps props;

public:
  AtlasCmd(jsi::Runtime &runtime, const jsi::Object &object,
           Variables &variables)
      : Command(CommandType::DrawAtlas) {
    convertProperty(runtime, object, "image", props.image, variables);
    convertProperty(runtime, object, "sprites", props.sprites, variables);
    convertProperty(runtime, object, "transforms", props.transforms, variables);
    convertProperty(runtime, object, "colors", props.colors, variables);
    convertProperty(runtime, object, "blendMode", props.blendMode, variables);
    convertProperty(runtime, object, "sampling", props.sampling, variables);
  }

  void draw(DrawingCtx *ctx) {
    if (props.image) {
      // Validate transforms and sprites have the same size
      if (props.transforms.size() != props.sprites.size()) {
        throw std::invalid_argument("transforms and sprites arrays must have the same length");
      }
      
      // Validate colors array matches if provided
      if (props.colors.has_value() && props.colors.value().size() != props.transforms.size()) {
        throw std::invalid_argument("colors array must have the same length as transforms/sprites");
      }
      
      auto colors =
          props.colors.has_value() ? props.colors.value().data() : nullptr;
      auto blendMode = props.blendMode.value_or(SkBlendMode::kDstOver);
      auto sampling =
          props.sampling.value_or(SkSamplingOptions(SkFilterMode::kLinear));

      ctx->canvas->drawAtlas(props.image.get(), props.transforms.data(),
                             props.sprites.data(), colors,
                             props.transforms.size(), blendMode, sampling,
                             nullptr, &(ctx->getPaint()));
    }
  }
};

} // namespace RNSkia
