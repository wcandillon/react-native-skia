#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiShaderModuleSpirvDescriptor : public JsiSkWrappingSharedPtrHostObject<
                                           wgpu::ShaderModuleSpirvDescriptor> {
public:
  JsiShaderModuleSpirvDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                                 wgpu::ShaderModuleSpirvDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::ShaderModuleSpirvDescriptor>(
            context,
            std::make_shared<wgpu::ShaderModuleSpirvDescriptor>(std::move(m))) {
  }

  EXPORT_JSI_API_TYPENAME(JsiShaderModuleSpirvDescriptor,
                          ShaderModuleSpirvDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::ShaderModuleSpirvDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiShaderModuleSpirvDescriptor>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
