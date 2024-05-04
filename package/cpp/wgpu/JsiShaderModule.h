#pragma once
#include <memory>
#include <string>
#include <utility>

#include "dawn/webgpu_cpp.h"

#include <jsi/jsi.h>

#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "JsiTextureView.h"
#include "MutableJSIBuffer.h"
#include "RNSkLog.h"
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

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiShaderModule, ShaderModule)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::ShaderModule *fromValue(jsi::Runtime &runtime,
                                       const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiShaderModule>(runtime)->getObject().get();
    } else {
      throw jsi::JSError(runtime,
                         "Expected a JsiShaderModule object, but got a " +
                             raw.toString(runtime).utf8(runtime));
    }
  }
};
} // namespace RNSkia
