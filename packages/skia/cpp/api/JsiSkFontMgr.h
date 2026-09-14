#pragma once

#include <memory>
#include <numeric>
#include <string>
#include <utility>
#include <vector>

#include "JsiSkConverters.h"
#include "JsiSkFontStyle.h"
#include "JsiSkNativeObjects.h"
#include "JsiSkTypeface.h"
#include "utils/RNSkLog.h"
#include <jsi/jsi.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkFontMgr.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkFontMgr
    : public JsiSkWrappingSkPtrNativeObject<JsiSkFontMgr, SkFontMgr> {
public:
  static constexpr const char *CLASS_NAME = "FontMgr";

  JsiSkFontMgr(std::shared_ptr<RNSkPlatformContext> context,
               sk_sp<SkFontMgr> fontMgr)
      : JsiSkWrappingSkPtrNativeObject<JsiSkFontMgr, SkFontMgr>(context,
                                                                fontMgr),
        _systemFontFamilies(context->getSystemFontFamilies()) {}

  int countFamilies() {
    return static_cast<int>(getObject()->countFamilies() +
                            _systemFontFamilies.size());
  }

  std::string getFamilyName(int i) {
    auto baseFamilyCount = getObject()->countFamilies();
    if (i < baseFamilyCount) {
      SkString name;
      getObject()->getFamilyName(i, &name);
      return std::string(name.c_str());
    }
    auto systemIndex = i - baseFamilyCount;
    if (systemIndex < static_cast<int>(_systemFontFamilies.size())) {
      return _systemFontFamilies[systemIndex];
    }
    throw std::runtime_error(
        "Font family index out of bounds: " + std::to_string(i) +
        " (total families: " +
        std::to_string(baseFamilyCount + _systemFontFamilies.size()) + ")");
  }

  std::shared_ptr<JsiSkTypeface>
  matchFamilyStyle(std::string name, std::shared_ptr<SkFontStyle> fontStyle) {
    // Resolve font family aliases (e.g., "System" -> ".AppleSystemUIFont" on
    // iOS)
    auto resolvedName = getContext()->resolveFontFamily(name);
    auto typeface =
        getObject()->matchFamilyStyle(resolvedName.c_str(), *fontStyle);
    return std::make_shared<JsiSkTypeface>(getContext(), std::move(typeface));
  }

  size_t getMemoryPressure() override { return 2048; }

  static sk_sp<SkFontMgr> fromValue(jsi::Runtime &runtime,
                                    const jsi::Value &obj) {
    return objectFromValue(runtime, obj);
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    installMethod(runtime, prototype, "countFamilies",
                  &JsiSkFontMgr::countFamilies);
    installMethod(runtime, prototype, "getFamilyName",
                  &JsiSkFontMgr::getFamilyName);
    installMethod(runtime, prototype, "matchFamilyStyle",
                  &JsiSkFontMgr::matchFamilyStyle);
  }

private:
  std::vector<std::string> _systemFontFamilies;
};

} // namespace RNSkia
