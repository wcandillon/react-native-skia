#pragma once

#include <memory>
#include <string>
#include <utility>
#include <vector>

#include <jsi/jsi.h>

#include "JsiSkConverters.h"
#include "JsiSkNativeObjects.h"
#include "utils/RNSkLog.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkFont.h"
#include "include/core/SkFontTypes.h"
#include "include/core/SkTypeface.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkTypeface
    : public JsiSkWrappingSkPtrNativeObject<JsiSkTypeface, SkTypeface> {
public:
  static constexpr const char *CLASS_NAME = "Typeface";

  JsiSkTypeface(std::shared_ptr<RNSkPlatformContext> context,
                sk_sp<SkTypeface> typeface)
      : JsiSkWrappingSkPtrNativeObject<JsiSkTypeface, SkTypeface>(
            std::move(context), std::move(typeface)) {}

  std::vector<int> getGlyphIDs(std::string str, JsiOptional<int> numGlyphs) {
    int numGlyphIDs =
        numGlyphs.has_value()
            ? *numGlyphs
            : getObject()->textToGlyphs(str.c_str(), str.length(),
                                        SkTextEncoding::kUTF8,
                                        SkSpan<SkGlyphID>(nullptr, 0));
    std::vector<SkGlyphID> glyphIDs;
    glyphIDs.resize(numGlyphIDs);
    getObject()->textToGlyphs(
        str.c_str(), str.length(), SkTextEncoding::kUTF8,
        SkSpan(static_cast<SkGlyphID *>(glyphIDs.data()), numGlyphIDs));
    return std::vector<int>(glyphIDs.begin(), glyphIDs.end());
  }

  size_t getMemoryPressure() override {
    auto typeface = getObject();
    if (!typeface) {
      return 0;
    }

    // Typefaces can be quite large as they contain font data
    // Since SkTypeface doesn't provide a direct memory usage method,
    // estimate based on glyph count (typically ranges from 64KB to several MB)
    int glyphCount = typeface->countGlyphs();
    return glyphCount > 0
               ? glyphCount * 64
               : 65536; // 64 bytes per glyph estimate, or 64KB minimum
  }

  /**
   Returns the jsi object from a host object of this type
  */
  static jsi::Value toValue(jsi::Runtime &runtime,
                            std::shared_ptr<RNSkPlatformContext> context,
                            sk_sp<SkTypeface> tf) {
    return makeJsiObject(
        runtime, std::make_shared<JsiSkTypeface>(context, std::move(tf)));
  }

  static sk_sp<SkTypeface> fromValue(jsi::Runtime &runtime,
                                     const jsi::Value &obj) {
    return objectFromValue(runtime, obj);
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    installMethod(runtime, prototype, "getGlyphIDs",
                  &JsiSkTypeface::getGlyphIDs);
  }
};

} // namespace RNSkia
