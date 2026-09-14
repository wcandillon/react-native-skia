#pragma once

#include <memory>
#include <string>
#include <utility>
#include <vector>

#include <jsi/jsi.h>

#include "JsiSkConverters.h"
#include "JsiSkFont.h"
#include "JsiSkNativeObjects.h"
#include "JsiSkRSXform.h"
#include "JsiSkTextBlob.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkTextBlob.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkTextBlobFactory : public JsiSkNativeObject<JsiSkTextBlobFactory> {
public:
  static constexpr const char *CLASS_NAME = "TextBlobFactory";

  std::shared_ptr<JsiSkTextBlob> MakeFromText(std::string str,
                                              std::shared_ptr<SkFont> font) {
    auto textBlob = SkTextBlob::MakeFromString(str.c_str(), *font);
    return std::make_shared<JsiSkTextBlob>(getContext(), std::move(textBlob));
  }

  std::shared_ptr<JsiSkTextBlob> MakeFromGlyphs(std::vector<int> glyphIds,
                                                std::shared_ptr<SkFont> font) {
    int bytesPerGlyph = 2;
    std::vector<SkGlyphID> glyphs;
    glyphs.reserve(glyphIds.size());
    for (auto glyph : glyphIds) {
      glyphs.push_back(static_cast<SkGlyphID>(glyph));
    }
    auto textBlob =
        SkTextBlob::MakeFromText(glyphs.data(), glyphs.size() * bytesPerGlyph,
                                 *font, SkTextEncoding::kGlyphID);
    return std::make_shared<JsiSkTextBlob>(getContext(), std::move(textBlob));
  }

  std::shared_ptr<JsiSkTextBlob>
  MakeFromRSXform(std::string str, std::vector<SkRSXform> rsxforms,
                  std::shared_ptr<SkFont> font) {
    auto x = SkSpan(rsxforms.data(), rsxforms.size());
    auto textBlob =
        SkTextBlob::MakeFromRSXform(str.c_str(), str.length(), x, *font);
    return std::make_shared<JsiSkTextBlob>(getContext(), std::move(textBlob));
  }

  std::shared_ptr<JsiSkTextBlob>
  MakeFromRSXformGlyphs(std::vector<int> glyphIds,
                        std::vector<SkRSXform> rsxforms,
                        std::shared_ptr<SkFont> font) {
    int bytesPerGlyph = 2;
    std::vector<SkGlyphID> glyphs;
    glyphs.reserve(glyphIds.size());
    for (auto glyph : glyphIds) {
      glyphs.push_back(static_cast<SkGlyphID>(glyph));
    }
    auto x = SkSpan(rsxforms.data(), rsxforms.size());
    auto textBlob = SkTextBlob::MakeFromRSXform(
        glyphs.data(), glyphs.size() * bytesPerGlyph, x, *font,
        SkTextEncoding::kGlyphID);
    return std::make_shared<JsiSkTextBlob>(getContext(), std::move(textBlob));
  }

  size_t getMemoryPressure() override { return 2048; }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installMethod(runtime, prototype, "MakeFromText",
                  &JsiSkTextBlobFactory::MakeFromText);
    installMethod(runtime, prototype, "MakeFromGlyphs",
                  &JsiSkTextBlobFactory::MakeFromGlyphs);
    installMethod(runtime, prototype, "MakeFromRSXform",
                  &JsiSkTextBlobFactory::MakeFromRSXform);
    installMethod(runtime, prototype, "MakeFromRSXformGlyphs",
                  &JsiSkTextBlobFactory::MakeFromRSXformGlyphs);
  }

  explicit JsiSkTextBlobFactory(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkNativeObject<JsiSkTextBlobFactory>(std::move(context)) {}
};

} // namespace RNSkia
