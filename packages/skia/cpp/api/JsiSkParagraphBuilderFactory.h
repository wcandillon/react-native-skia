#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkConverters.h"
#include "JsiSkNativeObjects.h"
#include "JsiSkParagraphBuilder.h"
#include "JsiSkParagraphStyle.h"
#include "JsiSkTypefaceFontProvider.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "modules/skparagraph/include/ParagraphBuilder.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

namespace para = skia::textlayout;

/**
 Implementation of the ParagraphBuilderFactory for making ParagraphBuilder JSI
 object
 */
class JsiSkParagraphBuilderFactory
    : public JsiSkNativeObject<JsiSkParagraphBuilderFactory> {
public:
  static constexpr const char *CLASS_NAME = "ParagraphBuilderFactory";

  std::shared_ptr<JsiSkParagraphBuilder>
  Make(JsiOptional<para::ParagraphStyle> paragraphStyle,
       JsiOptional<sk_sp<para::TypefaceFontProvider>> fontMgr) {
    return std::make_shared<JsiSkParagraphBuilder>(
        getContext(),
        paragraphStyle.has_value() ? *paragraphStyle : para::ParagraphStyle(),
        fontMgr.has_value() ? *fontMgr : nullptr);
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installMethod(runtime, prototype, "Make",
                  &JsiSkParagraphBuilderFactory::Make);
  }

  size_t getMemoryPressure() override { return 1024 * 1024; }

  explicit JsiSkParagraphBuilderFactory(
      std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkNativeObject<JsiSkParagraphBuilderFactory>(std::move(context)) {}
};

} // namespace RNSkia
