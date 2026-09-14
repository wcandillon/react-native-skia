#pragma once

#include <memory>
#include <string>
#include <utility>
#include <variant>
#include <vector>

#include <jsi/jsi.h>

#include "JsiSkCanvas.h"
#include "JsiSkFont.h"
#include "JsiSkNativeObjects.h"
#include "JsiSkPath.h"
#include "JsiSkRect.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "modules/skparagraph/include/Paragraph.h"
#include "modules/skparagraph/include/ParagraphBuilder.h"
#include "modules/skparagraph/include/ParagraphStyle.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;
namespace para = skia::textlayout;

/**
 * Implementation of the Paragraph object in JSI
 */
class JsiSkParagraph
    : public JsiSkWrappingSharedPtrNativeObject<JsiSkParagraph,
                                                para::Paragraph> {
public:
  static constexpr const char *CLASS_NAME = "Paragraph";

  void layout(double width) { getObject()->layout(width); }

  void paint(std::shared_ptr<JsiSkCanvas> jsiCanvas, double x, double y) {
    getObject()->paint(jsiCanvas->getCanvas(), x, y);
  }

  double getHeight() { return static_cast<double>(getObject()->getHeight()); }

  double getMaxWidth() {
    return static_cast<double>(getObject()->getMaxWidth());
  }

  double getMaxIntrinsicWidth() {
    return static_cast<double>(getObject()->getMaxIntrinsicWidth());
  }

  double getMinIntrinsicWidth() {
    return static_cast<double>(getObject()->getMinIntrinsicWidth());
  }

  double getLongestLine() {
    return static_cast<double>(getObject()->getLongestLine());
  }

  int getGlyphPositionAtCoordinate(double dx, double dy) {
    auto result = getObject()->getGlyphPositionAtCoordinate(dx, dy);
    return result.position;
  }

  std::vector<std::shared_ptr<JsiSkRect>> getRectsForRange(double start,
                                                           double end) {
    auto result =
        getObject()->getRectsForRange(start, end, para::RectHeightStyle::kTight,
                                      para::RectWidthStyle::kTight);
    std::vector<std::shared_ptr<JsiSkRect>> rects;
    rects.reserve(result.size());
    for (const auto &box : result) {
      rects.push_back(std::make_shared<JsiSkRect>(getContext(), box.rect));
    }
    return rects;
  }

  JSI_HOST_FUNCTION(getLineMetrics) {
    std::vector<para::LineMetrics> metrics;
    getObject()->getLineMetrics(metrics);
    auto returnValue = jsi::Array(runtime, metrics.size());

    for (size_t i = 0; i < metrics.size(); ++i) {
      auto lineMetrics = jsi::Object(runtime);

      // Text indices
      lineMetrics.setProperty(runtime, "startIndex",
                              static_cast<double>(metrics[i].fStartIndex));
      lineMetrics.setProperty(runtime, "endIndex",
                              static_cast<double>(metrics[i].fEndIndex));
      lineMetrics.setProperty(
          runtime, "endExcludingWhitespaces",
          static_cast<double>(metrics[i].fEndExcludingWhitespaces));
      lineMetrics.setProperty(
          runtime, "endIncludingNewline",
          static_cast<double>(metrics[i].fEndIncludingNewline));

      // Line break info
      lineMetrics.setProperty(runtime, "isHardBreak", metrics[i].fHardBreak);

      // Vertical metrics
      lineMetrics.setProperty(runtime, "ascent",
                              static_cast<double>(metrics[i].fAscent));
      lineMetrics.setProperty(runtime, "descent",
                              static_cast<double>(metrics[i].fDescent));
      lineMetrics.setProperty(runtime, "height",
                              static_cast<double>(metrics[i].fHeight));

      // Horizontal metrics
      lineMetrics.setProperty(runtime, "width",
                              static_cast<double>(metrics[i].fWidth));
      lineMetrics.setProperty(runtime, "left",
                              static_cast<double>(metrics[i].fLeft));

      // Position
      lineMetrics.setProperty(runtime, "baseline",
                              static_cast<double>(metrics[i].fBaseline));

      // Line number
      lineMetrics.setProperty(runtime, "lineNumber",
                              static_cast<double>(metrics[i].fLineNumber));

      returnValue.setValueAtIndex(runtime, i, lineMetrics);
    }
    return returnValue;
  }

  std::variant<std::nullptr_t, std::shared_ptr<JsiSkPath>>
  getPath(int lineNumber) {
    auto paragraph = getObject();
    // Paragraph::getPath does not bounds-check the line number.
    if (lineNumber < 0 ||
        static_cast<size_t>(lineNumber) >= paragraph->lineNumber()) {
      return nullptr;
    }
    // Paragraph::getPath resets its path builder after every visual run, so
    // for lines shaped as multiple runs (e.g. through font fallback) it only
    // returns the glyphs of the last run. Build the path from the per-glyph
    // data exposed by extendedVisit instead.
    SkPathBuilder builder;
    paragraph->extendedVisit(
        [lineNumber, &builder](
            int visitedLine, const para::Paragraph::ExtendedVisitorInfo *info) {
          if (visitedLine != lineNumber || info == nullptr) {
            return;
          }
          struct Rec {
            SkPathBuilder *builder;
            SkPoint origin;
            const SkPoint *pos;
          } rec = {&builder, info->origin, info->positions};
          info->font.getPaths(
              {info->glyphs, static_cast<size_t>(info->count)},
              [](const SkPath *src, const SkMatrix &mx, void *ctx) {
                auto *rec = static_cast<Rec *>(ctx);
                if (src != nullptr) {
                  SkMatrix total = mx;
                  total.postTranslate(rec->origin.fX + rec->pos->fX,
                                      rec->origin.fY + rec->pos->fY);
                  rec->builder->addPath(*src, total);
                }
                rec->pos += 1;
              },
              &rec);
        });
    SkPath path = builder.detach();
    return std::make_shared<JsiSkPath>(getContext(), std::move(path));
  }

  JSI_HOST_FUNCTION(extendedVisit) {
    auto visitorObject = getArgumentAsFunction(runtime, arguments, count, 0);
    auto visitor = visitorObject.asFunction(runtime);
    auto context = getContext();
    getObject()->extendedVisit(
        [&runtime, &visitor, &context](
            int lineNumber, const para::Paragraph::ExtendedVisitorInfo *info) {
          if (info == nullptr) {
            // Signals the end of the line
            visitor.call(runtime, static_cast<double>(lineNumber),
                         jsi::Value::null());
            return;
          }
          auto value = jsi::Object(runtime);

          value.setProperty(runtime, "font",
                            makeJsiObject(runtime, std::make_shared<JsiSkFont>(
                                                       context, info->font)));

          auto origin = jsi::Object(runtime);
          origin.setProperty(runtime, "x",
                             static_cast<double>(info->origin.x()));
          origin.setProperty(runtime, "y",
                             static_cast<double>(info->origin.y()));
          value.setProperty(runtime, "origin", origin);

          auto advance = jsi::Object(runtime);
          advance.setProperty(runtime, "width",
                              static_cast<double>(info->advance.width()));
          advance.setProperty(runtime, "height",
                              static_cast<double>(info->advance.height()));
          value.setProperty(runtime, "advance", advance);

          auto size = info->count;
          auto glyphs = jsi::Array(runtime, size);
          auto positions = jsi::Array(runtime, size);
          auto bounds = jsi::Array(runtime, size);
          auto utf8Starts = jsi::Array(runtime, size);
          for (int i = 0; i < size; ++i) {
            glyphs.setValueAtIndex(runtime, i,
                                   static_cast<double>(info->glyphs[i]));
            auto position = jsi::Object(runtime);
            position.setProperty(runtime, "x",
                                 static_cast<double>(info->positions[i].x()));
            position.setProperty(runtime, "y",
                                 static_cast<double>(info->positions[i].y()));
            positions.setValueAtIndex(runtime, i, position);
            bounds.setValueAtIndex(
                runtime, i,
                JsiSkRect::toValue(runtime, context, info->bounds[i]));
            utf8Starts.setValueAtIndex(
                runtime, i, static_cast<double>(info->utf8Starts[i]));
          }
          value.setProperty(runtime, "glyphs", glyphs);
          value.setProperty(runtime, "positions", positions);
          value.setProperty(runtime, "bounds", bounds);
          value.setProperty(runtime, "utf8Starts", utf8Starts);
          value.setProperty(runtime, "flags", static_cast<double>(info->flags));

          visitor.call(runtime, static_cast<double>(lineNumber), value);
        });
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(getRectsForPlaceholders) {
    std::vector<para::TextBox> placeholderInfos =
        getObject()->getRectsForPlaceholders();
    auto returnValue = jsi::Array(runtime, placeholderInfos.size());
    for (size_t i = 0; i < placeholderInfos.size(); ++i) {
      auto obj = jsi::Object(runtime);
      obj.setProperty(
          runtime, "rect",
          JsiSkRect::toValue(runtime, getContext(), placeholderInfos[i].rect));
      obj.setProperty(runtime, "direction",
                      static_cast<double>(placeholderInfos[i].direction));
      returnValue.setValueAtIndex(runtime, i, obj);
    }
    return returnValue;
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    installMethod(runtime, prototype, "layout", &JsiSkParagraph::layout);
    installMethod(runtime, prototype, "paint", &JsiSkParagraph::paint);
    installMethod(runtime, prototype, "getMaxWidth",
                  &JsiSkParagraph::getMaxWidth);
    installMethod(runtime, prototype, "getMinIntrinsicWidth",
                  &JsiSkParagraph::getMinIntrinsicWidth);
    installMethod(runtime, prototype, "getMaxIntrinsicWidth",
                  &JsiSkParagraph::getMaxIntrinsicWidth);
    installMethod(runtime, prototype, "getLongestLine",
                  &JsiSkParagraph::getLongestLine);
    installMethod(runtime, prototype, "getHeight", &JsiSkParagraph::getHeight);
    installHostMethod(runtime, prototype, "getRectsForPlaceholders",
                      &JsiSkParagraph::getRectsForPlaceholders);
    installMethod(runtime, prototype, "getGlyphPositionAtCoordinate",
                  &JsiSkParagraph::getGlyphPositionAtCoordinate);
    installMethod(runtime, prototype, "getRectsForRange",
                  &JsiSkParagraph::getRectsForRange);
    installHostMethod(runtime, prototype, "getLineMetrics",
                      &JsiSkParagraph::getLineMetrics);
    installMethod(runtime, prototype, "getPath", &JsiSkParagraph::getPath);
    installHostMethod(runtime, prototype, "extendedVisit",
                      &JsiSkParagraph::extendedVisit);
  }

  size_t getMemoryPressure() override { return 1024 * 1024; }

  explicit JsiSkParagraph(std::shared_ptr<RNSkPlatformContext> context,
                          para::ParagraphBuilder *paragraphBuilder)
      : JsiSkWrappingSharedPtrNativeObject<JsiSkParagraph, para::Paragraph>(
            std::move(context), paragraphBuilder->Build()) {}
};

} // namespace RNSkia
