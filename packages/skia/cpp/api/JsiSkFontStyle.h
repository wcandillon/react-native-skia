#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkNativeObjects.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkFontStyle.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkFontStyle
    : public JsiSkWrappingSharedPtrNativeObject<JsiSkFontStyle, SkFontStyle> {
public:
  static constexpr const char *CLASS_NAME = "FontStyle";

  JsiSkFontStyle(std::shared_ptr<RNSkPlatformContext> context,
                 const SkFontStyle &fontStyle)
      : JsiSkWrappingSharedPtrNativeObject<JsiSkFontStyle, SkFontStyle>(
            std::move(context), std::make_shared<SkFontStyle>(fontStyle)) {}

  /**
  Returns the underlying object from a host object of this type
 */
  static std::shared_ptr<SkFontStyle> fromValue(jsi::Runtime &runtime,
                                                const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    auto fontStyle = tryGetJsiObject<JsiSkFontStyle>(runtime, object);
    if (fontStyle) {
      return fontStyle->getObject();
    } else {
      auto weightProp = object.getProperty(runtime, "weight");
      auto weight = static_cast<int>(
          weightProp.isUndefined()
              ? static_cast<double>(SkFontStyle::Weight::kNormal_Weight)
              : weightProp.asNumber());
      auto widthProp = object.getProperty(runtime, "width");
      auto width = static_cast<int>(
          widthProp.isUndefined()
              ? static_cast<double>(SkFontStyle::Width::kNormal_Width)
              : widthProp.asNumber());
      auto slantProp = object.getProperty(runtime, "slant");
      auto slant = static_cast<SkFontStyle::Slant>(
          slantProp.isUndefined()
              ? static_cast<double>(SkFontStyle::Slant::kUpright_Slant)
              : slantProp.asNumber());
      SkFontStyle style(weight, width, slant);
      return std::make_shared<SkFontStyle>(style);
    }
  }

  size_t getMemoryPressure() override {
    return std::max(sizeof(SkFontStyle), kMinMemoryPressure);
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
  }

  /**
  Returns the jsi object from a host object of this type
 */
  static jsi::Value toValue(jsi::Runtime &runtime,
                            std::shared_ptr<RNSkPlatformContext> context,
                            const SkFontStyle &fontStyle) {
    return makeJsiObject(runtime, std::make_shared<JsiSkFontStyle>(
                                      std::move(context), fontStyle));
  }
};
} // namespace RNSkia
