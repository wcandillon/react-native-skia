#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkNativeObjects.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkPathEffect.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkPathEffect
    : public JsiSkWrappingSkPtrNativeObject<JsiSkPathEffect, SkPathEffect> {
public:
  static constexpr const char *CLASS_NAME = "PathEffect";

  JsiSkPathEffect(std::shared_ptr<RNSkPlatformContext> context,
                  sk_sp<SkPathEffect> pathEffect)
      : JsiSkWrappingSkPtrNativeObject<JsiSkPathEffect, SkPathEffect>(
            std::move(context), std::move(pathEffect)) {}

  size_t getMemoryPressure() override { return 2048; }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
  }

  /**
    Returns the underlying object from a host object of this type
   */
  static sk_sp<SkPathEffect> fromValue(jsi::Runtime &runtime,
                                       const jsi::Value &obj) {
    return objectFromValue(runtime, obj);
  }
};

} // namespace RNSkia
