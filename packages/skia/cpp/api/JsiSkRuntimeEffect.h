#pragma once

#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "JsiSkConverters.h"
#include "JsiSkMatrix.h"
#include "JsiSkNativeObjects.h"
#include "JsiSkShader.h"

#include <jsi/jsi.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/effects/SkRuntimeEffect.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

// Helper to see a bit pattern as a float (w/o aliasing warnings)
static inline float SkBits2Float(uint32_t bits) {
  float value;
  memcpy(&value, &bits, sizeof(float));
  return value;
}

struct RuntimeEffectUniform {
  int columns;
  int rows;
  int slot; // the index into the uniforms array that this uniform begins.
  bool isInteger;
};

} // namespace RNSkia

namespace RNJsi {

// RuntimeEffectUniform -> {columns, rows, slot, isInteger}
template <> struct JSIConverter<RNSkia::RuntimeEffectUniform> {
  static jsi::Value toJSI(jsi::Runtime &runtime,
                          const RNSkia::RuntimeEffectUniform &u) {
    jsi::Object result(runtime);
    result.setProperty(runtime, "columns", u.columns);
    result.setProperty(runtime, "rows", u.rows);
    result.setProperty(runtime, "slot", u.slot);
    result.setProperty(runtime, "isInteger", u.isInteger);
    return result;
  }
};

} // namespace RNJsi

namespace RNSkia {

class JsiSkRuntimeEffect
    : public JsiSkWrappingSkPtrNativeObject<JsiSkRuntimeEffect,
                                            SkRuntimeEffect> {
public:
  static constexpr const char *CLASS_NAME = "RuntimeEffect";

  std::shared_ptr<JsiSkShader>
  makeShader(std::vector<double> uniformValues,
             JsiOptional<std::shared_ptr<SkMatrix>> matrix) {
    auto uniforms = castUniforms(uniformValues);
    auto shader = getObject()->makeShader(
        std::move(uniforms), nullptr, 0,
        matrix.has_value() ? matrix->get() : nullptr);
    return std::make_shared<JsiSkShader>(getContext(), std::move(shader));
  }

  std::shared_ptr<JsiSkShader>
  makeShaderWithChildren(std::vector<double> uniformValues,
                         std::vector<sk_sp<SkShader>> children,
                         JsiOptional<std::shared_ptr<SkMatrix>> matrix) {
    auto uniforms = castUniforms(uniformValues);
    auto shader = getObject()->makeShader(
        std::move(uniforms), children.data(), children.size(),
        matrix.has_value() ? matrix->get() : nullptr);
    return std::make_shared<JsiSkShader>(getContext(), std::move(shader));
  }

  int getUniformCount() {
    return static_cast<int>(getObject()->uniforms().size());
  }

  int getUniformFloatCount() {
    return static_cast<int>(getObject()->uniformSize() / sizeof(float));
  }

  std::string getUniformName(int i) {
    if (i < 0 || i >= getObject()->uniforms().size()) {
      throw std::runtime_error("invalid uniform index");
    }
    auto it = getObject()->uniforms().begin() + i;
    return std::string(it->name);
  }

  RuntimeEffectUniform getUniform(int i) {
    if (i < 0 || i >= getObject()->uniforms().size()) {
      throw std::runtime_error("invalid uniform index");
    }
    auto it = getObject()->uniforms().begin() + i;
    return fromUniform(*it);
  }

  std::string source() { return std::string(getObject()->source()); }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    installMethod(runtime, prototype, "makeShader",
                  &JsiSkRuntimeEffect::makeShader);
    installMethod(runtime, prototype, "makeShaderWithChildren",
                  &JsiSkRuntimeEffect::makeShaderWithChildren);
    installMethod(runtime, prototype, "getUniformCount",
                  &JsiSkRuntimeEffect::getUniformCount);
    installMethod(runtime, prototype, "getUniformFloatCount",
                  &JsiSkRuntimeEffect::getUniformFloatCount);
    installMethod(runtime, prototype, "getUniformName",
                  &JsiSkRuntimeEffect::getUniformName);
    installMethod(runtime, prototype, "getUniform",
                  &JsiSkRuntimeEffect::getUniform);
    installMethod(runtime, prototype, "source", &JsiSkRuntimeEffect::source);
  }

  JsiSkRuntimeEffect(std::shared_ptr<RNSkPlatformContext> context,
                     sk_sp<SkRuntimeEffect> rt)
      : JsiSkWrappingSkPtrNativeObject<JsiSkRuntimeEffect, SkRuntimeEffect>(
            std::move(context), std::move(rt)) {}

  /**
    Returns the underlying object from a host object of this type
   */
  static sk_sp<SkRuntimeEffect> fromValue(jsi::Runtime &runtime,
                                          const jsi::Value &obj) {
    return getJsiObject<JsiSkRuntimeEffect>(runtime, obj)->getObject();
  }

  size_t getMemoryPressure() override { return 4096; }

  static RuntimeEffectUniform fromUniform(const SkRuntimeEffect::Uniform &u) {
    RuntimeEffectUniform su;
    su.rows = u.count; // arrayLength
    su.columns = 1;
    su.isInteger = false;
    using Type = SkRuntimeEffect::Uniform::Type;
    switch (u.type) {
    case Type::kFloat:
      break;
    case Type::kFloat2:
      su.columns = 2;
      break;
    case Type::kFloat3:
      su.columns = 3;
      break;
    case Type::kFloat4:
      su.columns = 4;
      break;
    case Type::kFloat2x2:
      su.columns = 2;
      su.rows *= 2;
      break;
    case Type::kFloat3x3:
      su.columns = 3;
      su.rows *= 3;
      break;
    case Type::kFloat4x4:
      su.columns = 4;
      su.rows *= 4;
      break;
    case Type::kInt:
      su.isInteger = true;
      break;
    case Type::kInt2:
      su.columns = 2;
      su.isInteger = true;
      break;
    case Type::kInt3:
      su.columns = 3;
      su.isInteger = true;
      break;
    case Type::kInt4:
      su.columns = 4;
      su.isInteger = true;
      break;
    }
    su.slot = static_cast<int>(u.offset / sizeof(float));
    return su;
  }

private:
  sk_sp<SkData> castUniforms(const std::vector<double> &values) {
    // verify size of input uniforms
    if (values.size() * sizeof(float) != getObject()->uniformSize()) {
      throw std::runtime_error(
          "Uniforms size differs from effect's uniform size. Received " +
          std::to_string(values.size()) + " expected " +
          std::to_string(getObject()->uniformSize() / sizeof(float)));
    }

    auto uniforms = SkData::MakeUninitialized(getObject()->uniformSize());

    // Convert to skia uniforms
    const auto &u = getObject()->uniforms();
    for (std::size_t i = 0; i < u.size(); i++) {
      auto it = getObject()->uniforms().begin() + i;
      RuntimeEffectUniform reu = fromUniform(*it);
      for (std::size_t j = 0; j < reu.columns * reu.rows; ++j) {
        const std::size_t offset = reu.slot + j;
        float fValue = static_cast<float>(values[offset]);
        int iValue = static_cast<int>(fValue);
        auto value = reu.isInteger ? SkBits2Float(iValue) : fValue;
        memcpy(SkTAddOffset<void>(uniforms->writable_data(),
                                  offset * sizeof(value)),
               &value, sizeof(value));
      }
    }
    return uniforms;
  }
};
} // namespace RNSkia
