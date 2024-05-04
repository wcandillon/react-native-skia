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

class JsiShaderModuleWGSLDescriptor : public JsiSkWrappingSharedPtrHostObject<
                                          wgpu::ShaderModuleWGSLDescriptor> {
public:
  JsiShaderModuleWGSLDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                                wgpu::ShaderModuleWGSLDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::ShaderModuleWGSLDescriptor>(
            context,
            std::make_shared<wgpu::ShaderModuleWGSLDescriptor>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiShaderModuleWGSLDescriptor,
                           ShaderModuleWGSLDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::ShaderModuleWGSLDescriptor *fromValue(jsi::Runtime &runtime,
                                                     const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiShaderModuleWGSLDescriptor>(runtime)
          ->getObject()
          .get();
    } else {
      auto object = new wgpu::ShaderModuleWGSLDescriptor();

      object->sType = wgpu::SType::ShaderModuleWGSLDescriptor;
      if (obj.hasProperty(runtime, "code")) {
        auto code = obj.getProperty(runtime, "code");

        object->code = strdup(code.getString(runtime).utf8(runtime).c_str());
      } else {
        throw jsi::JSError(
            runtime,
            "Missing mandatory prop code in ShaderModuleWGSLDescriptor");
      }
      return object;
    }
  }
};
} // namespace RNSkia
