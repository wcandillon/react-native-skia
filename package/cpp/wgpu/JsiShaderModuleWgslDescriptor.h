#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiShaderModuleWgslDescriptor : public JsiSkWrappingSharedPtrHostObject<
                                          wgpu::ShaderModuleWgslDescriptor> {
public:
  JsiShaderModuleWgslDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                                wgpu::ShaderModuleWgslDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::ShaderModuleWgslDescriptor>(
            context,
            std::make_shared<wgpu::ShaderModuleWgslDescriptor>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiShaderModuleWgslDescriptor,
                          ShaderModuleWgslDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::ShaderModuleWgslDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiShaderModuleWgslDescriptor>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
