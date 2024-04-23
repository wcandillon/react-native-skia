#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiShaderModule
    : public JsiSkWrappingSharedPtrHostObject<wgpu::ShaderModule> {
public:
  JsiShaderModule(std::shared_ptr<RNSkPlatformContext> context,
                  wgpu::ShaderModule m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::ShaderModule>(
            context, std::make_shared<wgpu::ShaderModule>(std::move(m))) {}

  JSI_HOST_FUNCTION(getCompilationInfo) {
    auto callback =
        JsiCompilationInfoCallback::fromValue(runtime, arguments[0]);
    auto userdata = JsiVoid::fromValue(runtime, arguments[1]);
    getObject()->getCompilationInfo(*callback.get(), *userdata.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(setLabel) {
    auto label = JsiChar::fromValue(runtime, arguments[0]);
    auto ret = getObject()->setLabel(*label.get());
    return jsi::Value(ret);
  }

  EXPORT_JSI_API_TYPENAME(JsiShaderModule, ShaderModule)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiShaderModule, getCompilationInfo),
                       JSI_EXPORT_FUNC(JsiShaderModule, setLabel))

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::ShaderModule> fromValue(jsi::Runtime &runtime,
                                                       const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiShaderModule>(runtime)->getObject();
  }
};
} // namespace RNSkia
