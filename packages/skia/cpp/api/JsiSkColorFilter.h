#pragma once

#include "JsiSkNativeObjects.h"
#include <jsi/jsi.h>
#include <memory>
#include <utility>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkColorFilter.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkColorFilter
    : public JsiSkWrappingSkPtrNativeObject<JsiSkColorFilter, SkColorFilter> {
public:
  static constexpr const char *CLASS_NAME = "ColorFilter";

  JsiSkColorFilter(std::shared_ptr<RNSkPlatformContext> context,
                   sk_sp<SkColorFilter> colorFilter)
      : JsiSkWrappingSkPtrNativeObject<JsiSkColorFilter, SkColorFilter>(
            std::move(context), std::move(colorFilter)) {}

  size_t getMemoryPressure() override { return 2048; }

  static sk_sp<SkColorFilter> fromValue(jsi::Runtime &runtime,
                                        const jsi::Value &obj) {
    return objectFromValue(runtime, obj);
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
  }
};

} // namespace RNSkia
