#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkNativeObjects.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkTextBlob.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkTextBlob
    : public JsiSkWrappingSkPtrNativeObject<JsiSkTextBlob, SkTextBlob> {
public:
  static constexpr const char *CLASS_NAME = "TextBlob";

  JsiSkTextBlob(std::shared_ptr<RNSkPlatformContext> context,
                sk_sp<SkTextBlob> shader)
      : JsiSkWrappingSkPtrNativeObject<JsiSkTextBlob, SkTextBlob>(
            std::move(context), std::move(shader)) {}

  size_t getMemoryPressure() override {
    auto textBlob = getObject();
    if (!textBlob)
      return 0;

    // For SkTextBlob, we'll estimate based on glyph data and text positioning
    // SkTextBlob doesn't provide direct size methods, so estimate
    // conservatively
    return textBlob->bounds().width() * textBlob->bounds().height() +
           1024; // Area estimation + base overhead
  }

  static sk_sp<SkTextBlob> fromValue(jsi::Runtime &runtime,
                                     const jsi::Value &obj) {
    return objectFromValue(runtime, obj);
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
  }
};
} // namespace RNSkia
