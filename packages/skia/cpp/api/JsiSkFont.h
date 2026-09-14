#pragma once

#include <memory>
#include <numeric>
#include <optional>
#include <string>
#include <utility>
#include <variant>
#include <vector>

#include "JsiSkNativeObjects.h"
#include "utils/RNSkLog.h"
#include <jsi/jsi.h>

#include "JsiSkConverters.h"
#include "JsiSkPaint.h"
#include "JsiSkPoint.h"
#include "JsiSkRect.h"
#include "JsiSkTypeface.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkFont.h"
#include "include/core/SkFontMetrics.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkFont : public JsiSkWrappingSharedPtrNativeObject<JsiSkFont, SkFont> {
public:
  static constexpr const char *CLASS_NAME = "Font";

  std::vector<double>
  getGlyphWidths(std::vector<int> glyphs,
                 std::optional<std::shared_ptr<SkPaint>> paint) {
    std::vector<SkGlyphID> glyphIds;
    glyphIds.reserve(glyphs.size());
    for (auto glyph : glyphs) {
      glyphIds.push_back(static_cast<SkGlyphID>(glyph));
    }
    std::vector<SkScalar> widths;
    widths.resize(glyphIds.size());
    auto g = SkSpan(glyphIds.data(), glyphIds.size());
    auto w = SkSpan(widths.data(), widths.size());
    getObject()->getWidthsBounds(
        g, w, {}, paint.has_value() ? paint.value().get() : nullptr);
    return std::vector<double>(widths.begin(), widths.end());
  }

  // TODO: deprecate
  int getTextWidth(std::string str,
                   std::optional<std::shared_ptr<SkPaint>> paint) {
    auto numGlyphIDs = getObject()->countText(str.c_str(), str.length(),
                                              SkTextEncoding::kUTF8);
    std::vector<SkGlyphID> glyphs;
    glyphs.resize(numGlyphIDs);
    auto g = SkSpan(glyphs.data(), glyphs.size());
    getObject()->textToGlyphs(str.c_str(), str.length(), SkTextEncoding::kUTF8,
                              g);
    std::vector<SkScalar> widths;
    widths.resize(numGlyphIDs);
    auto w = SkSpan(widths.data(), widths.size());
    getObject()->getWidthsBounds(
        g, w, {}, paint.has_value() ? paint.value().get() : nullptr);
    return std::accumulate(widths.begin(), widths.end(), 0);
  }

  std::shared_ptr<JsiSkRect>
  measureText(std::string str, std::optional<std::shared_ptr<SkPaint>> paint) {
    SkRect bounds;
    getObject()->measureText(str.c_str(), str.length(), SkTextEncoding::kUTF8,
                             &bounds,
                             paint.has_value() ? paint.value().get() : nullptr);
    return std::make_shared<JsiSkRect>(getContext(), bounds);
  }

  // Stays raw: the result object has a conditionally present `bounds`
  // property, which a typed return value cannot express.
  JSI_HOST_FUNCTION(getMetrics) {
    SkFontMetrics fm;
    getObject()->getMetrics(&fm);
    auto metrics = jsi::Object(runtime);
    metrics.setProperty(runtime, "ascent", fm.fAscent);
    metrics.setProperty(runtime, "descent", fm.fDescent);
    metrics.setProperty(runtime, "leading", fm.fLeading);
    if (!(fm.fFlags & SkFontMetrics::kBoundsInvalid_Flag)) {
      auto bounds = SkRect::MakeLTRB(fm.fXMin, fm.fTop, fm.fXMax, fm.fBottom);
      auto jsiBounds =
          JsiSkRect::toValue(runtime, getContext(), std::move(bounds));
      metrics.setProperty(runtime, "bounds", std::move(jsiBounds));
    }
    return metrics;
  }

  std::vector<int> getGlyphIDs(std::string str, JsiOptional<int> numGlyphs) {
    int numGlyphIDs = numGlyphs.has_value()
                          ? *numGlyphs
                          : getObject()->countText(str.c_str(), str.length(),
                                                   SkTextEncoding::kUTF8);
    std::vector<SkGlyphID> glyphIDs;
    glyphIDs.resize(numGlyphIDs);
    auto g = SkSpan(static_cast<SkGlyphID *>(glyphIDs.data()), glyphIDs.size());
    getObject()->textToGlyphs(str.c_str(), str.length(), SkTextEncoding::kUTF8,
                              g);
    return std::vector<int>(glyphIDs.begin(), glyphIDs.end());
  }

  std::vector<int> getGlyphIntercepts(std::vector<int> glyphs,
                                      std::vector<SkPoint> positions,
                                      double top, double bottom) {
    std::vector<SkGlyphID> glyphIds;
    glyphIds.reserve(glyphs.size());
    for (auto glyph : glyphs) {
      glyphIds.push_back(static_cast<SkGlyphID>(glyph));
    }
    if (glyphIds.size() > positions.size()) {
      throw std::runtime_error("Not enough x,y position pairs for glyphs");
    }
    auto g = SkSpan(glyphIds.data(), glyphIds.size());
    auto p = SkSpan(positions.data(), positions.size());
    auto sects = getObject()->getIntercepts(g, p, top, bottom);
    return std::vector<int>(sects.begin(), sects.end());
  }

  double getScaleX() { return SkScalarToDouble(getObject()->getScaleX()); }

  double getSize() { return SkScalarToDouble(getObject()->getSize()); }

  double getSkewX() { return SkScalarToDouble(getObject()->getSkewX()); }

  bool isEmbolden() { return getObject()->isEmbolden(); }

  std::shared_ptr<JsiSkTypeface> getTypeface() {
    // refTypeface(), not getTypeface(): the wrapper owns what it is handed.
    return std::make_shared<JsiSkTypeface>(getContext(),
                                           getObject()->refTypeface());
  }

  void setEdging(double edging) {
    getObject()->setEdging(static_cast<SkFont::Edging>(edging));
  }

  void setEmbeddedBitmaps(bool embeddedBitmaps) {
    getObject()->setEmbeddedBitmaps(embeddedBitmaps);
  }

  void setHinting(double hinting) {
    getObject()->setHinting(static_cast<SkFontHinting>(hinting));
  }

  void setLinearMetrics(bool linearMetrics) {
    getObject()->setLinearMetrics(linearMetrics);
  }

  void setScaleX(double scaleX) { getObject()->setScaleX(scaleX); }

  void setSkewX(double skewX) { getObject()->setSkewX(skewX); }

  void setSize(double size) { getObject()->setSize(size); }

  void setEmbolden(bool embolden) { getObject()->setEmbolden(embolden); }

  void setSubpixel(bool subpixel) { getObject()->setSubpixel(subpixel); }

  void setTypeface(std::variant<std::nullptr_t, sk_sp<SkTypeface>> typeface) {
    getObject()->setTypeface(
        std::holds_alternative<std::nullptr_t>(typeface)
            ? nullptr
            : std::get<sk_sp<SkTypeface>>(std::move(typeface)));
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    installMethod(runtime, prototype, "getSize", &JsiSkFont::getSize);
    installHostMethod(runtime, prototype, "getMetrics", &JsiSkFont::getMetrics);
    installMethod(runtime, prototype, "getGlyphIDs", &JsiSkFont::getGlyphIDs);
    installMethod(runtime, prototype, "getGlyphIntercepts",
                  &JsiSkFont::getGlyphIntercepts);
    installMethod(runtime, prototype, "getScaleX", &JsiSkFont::getScaleX);
    installMethod(runtime, prototype, "getSkewX", &JsiSkFont::getSkewX);
    installMethod(runtime, prototype, "getTypeface", &JsiSkFont::getTypeface);
    installMethod(runtime, prototype, "setEdging", &JsiSkFont::setEdging);
    installMethod(runtime, prototype, "embeddedBitmaps",
                  &JsiSkFont::setEmbeddedBitmaps);
    installMethod(runtime, prototype, "setHinting", &JsiSkFont::setHinting);
    installMethod(runtime, prototype, "setLinearMetrics",
                  &JsiSkFont::setLinearMetrics);
    installMethod(runtime, prototype, "setScaleX", &JsiSkFont::setScaleX);
    installMethod(runtime, prototype, "setSkewX", &JsiSkFont::setSkewX);
    installMethod(runtime, prototype, "setSize", &JsiSkFont::setSize);
    installMethod(runtime, prototype, "setEmbolden", &JsiSkFont::setEmbolden);
    installMethod(runtime, prototype, "setSubpixel", &JsiSkFont::setSubpixel);
    installMethod(runtime, prototype, "setTypeface", &JsiSkFont::setTypeface);
    installMethod(runtime, prototype, "getGlyphWidths",
                  &JsiSkFont::getGlyphWidths);
    installMethod(runtime, prototype, "getTextWidth", &JsiSkFont::getTextWidth);
    installMethod(runtime, prototype, "measureText", &JsiSkFont::measureText);
  }

  JsiSkFont(std::shared_ptr<RNSkPlatformContext> context, const SkFont &font)
      : JsiSkWrappingSharedPtrNativeObject<JsiSkFont, SkFont>(
            std::move(context), std::make_shared<SkFont>(font)) {}

  size_t getMemoryPressure() override {
    return std::max(sizeof(SkFont), kMinMemoryPressure);
  }

  /**
    Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<SkFont> fromValue(jsi::Runtime &runtime,
                                           const jsi::Value &obj) {
    return objectFromValue(runtime, obj);
  }

  /**
   * Creates the function for construction a new instance of the SkFont
   * wrapper
   * @param context Platform context
   * @return A function for creating a new host object wrapper for the SkFont
   * class
   */
  static const jsi::HostFunctionType
  createCtor(std::shared_ptr<RNSkPlatformContext> context) {
    return JSI_HOST_FUNCTION_LAMBDA {
      // Handle arguments
      if (count == 2) {
        auto typeface = JsiSkTypeface::fromValue(runtime, arguments[0]);
        auto size = arguments[1].asNumber();
        return makeJsiObject(runtime, std::make_shared<JsiSkFont>(
                                          context, SkFont(typeface, size)));
      } else if (count == 1) {
        auto typeface = JsiSkTypeface::fromValue(runtime, arguments[0]);
        return makeJsiObject(
            runtime, std::make_shared<JsiSkFont>(context, SkFont(typeface)));
      } else {
        // Return the newly constructed object
        return makeJsiObject(runtime,
                             std::make_shared<JsiSkFont>(context, SkFont()));
      }
    };
  }
};

} // namespace RNSkia
