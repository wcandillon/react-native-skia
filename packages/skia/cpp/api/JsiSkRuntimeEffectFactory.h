#pragma once

#include <memory>
#include <string>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkNativeObjects.h"
#include "JsiSkRuntimeEffect.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkRuntimeEffectFactory
    : public JsiSkNativeObject<JsiSkRuntimeEffectFactory> {
public:
  static constexpr const char *CLASS_NAME = "RuntimeEffectFactory";

  std::shared_ptr<JsiSkRuntimeEffect> Make(std::string sksl) {
    auto result = SkRuntimeEffect::MakeForShader(SkString(sksl));
    auto effect = result.effect;
    auto errorText = result.errorText;
    if (!effect) {
      throw std::runtime_error("Error in sksl:\n" +
                               std::string(errorText.c_str()));
    }
    return std::make_shared<JsiSkRuntimeEffect>(getContext(),
                                                std::move(effect));
  }

  size_t getMemoryPressure() override { return 1024; }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installMethod(runtime, prototype, "Make", &JsiSkRuntimeEffectFactory::Make);
  }

  explicit JsiSkRuntimeEffectFactory(
      std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkNativeObject<JsiSkRuntimeEffectFactory>(std::move(context)) {}
};

} // namespace RNSkia
