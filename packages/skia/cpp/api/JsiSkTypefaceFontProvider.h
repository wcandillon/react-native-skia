#pragma once

#include <memory>
#include <optional>
#include <string>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkConverters.h"
#include "JsiSkFontStyle.h"
#include "JsiSkNativeObjects.h"
#include "JsiSkTypeface.h"

#include "utils/RNSkLog.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkFont.h"
#include "modules/skparagraph/include/TypefaceFontProvider.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;
namespace para = skia::textlayout;

class JsiSkTypefaceFontProvider
    : public JsiSkWrappingSkPtrNativeObject<JsiSkTypefaceFontProvider,
                                            para::TypefaceFontProvider> {
public:
  static constexpr const char *CLASS_NAME = "TypefaceFontProvider";

  void registerFont(sk_sp<SkTypeface> typeface, std::string familyNameStr) {
    SkString familyName(familyNameStr.c_str());
    getObject()->registerTypeface(typeface, familyName);
  }

  std::shared_ptr<JsiSkTypeface>
  matchFamilyStyle(std::optional<std::string> nameParam,
                   std::optional<std::shared_ptr<SkFontStyle>> fontStyleParam) {
    auto name = nameParam.value_or("");
    auto fontStyle = fontStyleParam.value_or(nullptr);
    if (name == "" || fontStyle == nullptr) {
      throw std::runtime_error("matchFamilyStyle requires a name and a style");
    }
    auto set = getObject()->onMatchFamily(name.c_str());
    if (!set) {
      throw std::runtime_error("Could not find font family " + name);
    }
    auto typeface = set->matchStyle(*fontStyle);
    if (!typeface) {
      throw std::runtime_error("Could not find font style for " + name);
    }
    return std::make_shared<JsiSkTypeface>(getContext(), std::move(typeface));
  }

  int countFamilies() { return getObject()->countFamilies(); }

  std::string getFamilyName(int i) {
    SkString name;
    getObject()->getFamilyName(i, &name);
    return std::string(name.c_str());
  }

  JsiSkTypefaceFontProvider(std::shared_ptr<RNSkPlatformContext> context,
                            sk_sp<para::TypefaceFontProvider> tfProvider)
      : JsiSkWrappingSkPtrNativeObject<JsiSkTypefaceFontProvider,
                                       para::TypefaceFontProvider>(
            std::move(context), std::move(tfProvider)) {}

  size_t getMemoryPressure() override { return 4096; }

  /**
   Returns the jsi object from a host object of this type
  */
  static jsi::Value toValue(jsi::Runtime &runtime,
                            std::shared_ptr<RNSkPlatformContext> context,
                            sk_sp<para::TypefaceFontProvider> tfProvider) {
    return makeJsiObject(runtime,
                         std::make_shared<JsiSkTypefaceFontProvider>(
                             std::move(context), std::move(tfProvider)));
  }

  static sk_sp<para::TypefaceFontProvider> fromValue(jsi::Runtime &runtime,
                                                     const jsi::Value &obj) {
    return objectFromValue(runtime, obj);
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    installMethod(runtime, prototype, "registerFont",
                  &JsiSkTypefaceFontProvider::registerFont);
    installMethod(runtime, prototype, "matchFamilyStyle",
                  &JsiSkTypefaceFontProvider::matchFamilyStyle);
    installMethod(runtime, prototype, "countFamilies",
                  &JsiSkTypefaceFontProvider::countFamilies);
    installMethod(runtime, prototype, "getFamilyName",
                  &JsiSkTypefaceFontProvider::getFamilyName);
  }
};

} // namespace RNSkia
