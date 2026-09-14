#pragma once

#include <memory>
#include <string>
#include <utility>
#include <vector>

#include <jsi/jsi.h>

#include "JsiSkNativeObjects.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "JsiSkRuntimeEffect.h"
#include "include/effects/SkRuntimeEffect.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkRuntimeShaderBuilder
    : public JsiSkWrappingSharedPtrNativeObject<JsiSkRuntimeShaderBuilder,
                                                SkRuntimeShaderBuilder> {
public:
  static constexpr const char *CLASS_NAME = "RuntimeShaderBuilder";

  /**
   Constructor
   */
  JsiSkRuntimeShaderBuilder(std::shared_ptr<RNSkPlatformContext> context,
                            const SkRuntimeShaderBuilder &rt)
      : JsiSkWrappingSharedPtrNativeObject<JsiSkRuntimeShaderBuilder,
                                           SkRuntimeShaderBuilder>(
            std::move(context), std::make_shared<SkRuntimeShaderBuilder>(rt)) {}

  void setUniform(std::string name, std::vector<float> value) {
    getObject()
        ->uniform(name.c_str())
        .set(value.data(), static_cast<int>(value.size()));
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    installMethod(runtime, prototype, "setUniform",
                  &JsiSkRuntimeShaderBuilder::setUniform);
  }

  /**
    Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<SkRuntimeShaderBuilder>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    return getJsiObject<JsiSkRuntimeShaderBuilder>(runtime, obj)->getObject();
  }

  /**
    Returns the jsi object from a host object of this type
   */
  static jsi::Value toValue(jsi::Runtime &runtime,
                            std::shared_ptr<RNSkPlatformContext> context,
                            const SkRuntimeShaderBuilder &rt) {
    return makeJsiObject(runtime, std::make_shared<JsiSkRuntimeShaderBuilder>(
                                      std::move(context), rt));
  }

  size_t getMemoryPressure() override {
    return std::max(sizeof(SkRuntimeShaderBuilder), kMinMemoryPressure);
  }

  /**
   * Creates the function for construction a new instance of the SkRect
   * wrapper
   * @param context platform context
   * @return A function for creating a new host object wrapper for the SkRect
   * class
   */
  static const jsi::HostFunctionType
  createCtor(std::shared_ptr<RNSkPlatformContext> context) {
    return JSI_HOST_FUNCTION_LAMBDA {
      auto rt = JsiSkRuntimeEffect::fromValue(runtime, arguments[0]);
      auto rtb = SkRuntimeShaderBuilder(rt);
      // Return the newly constructed object
      return makeJsiObject(runtime, std::make_shared<JsiSkRuntimeShaderBuilder>(
                                        std::move(context), std::move(rtb)));
    };
  }
};
} // namespace RNSkia
