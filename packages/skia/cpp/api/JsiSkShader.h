#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkNativeObjects.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkShader.h"
#include "include/effects/SkGradient.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkShader
    : public JsiSkWrappingSkPtrNativeObject<JsiSkShader, SkShader> {
public:
  static constexpr const char *CLASS_NAME = "Shader";

  JsiSkShader(std::shared_ptr<RNSkPlatformContext> context,
              sk_sp<SkShader> shader)
      : JsiSkWrappingSkPtrNativeObject<JsiSkShader, SkShader>(
            std::move(context), std::move(shader)) {}

  size_t getMemoryPressure() override { return 1024 * 1024; }

  static sk_sp<SkShader> fromValue(jsi::Runtime &runtime,
                                   const jsi::Value &obj) {
    return objectFromValue(runtime, obj);
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
  }
};
} // namespace RNSkia
