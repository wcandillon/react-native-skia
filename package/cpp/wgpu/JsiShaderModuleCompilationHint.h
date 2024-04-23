#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiPipelineLayout.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiShaderModuleCompilationHint : public JsiSkWrappingSharedPtrHostObject<
                                           wgpu::ShaderModuleCompilationHint> {
public:
  JsiShaderModuleCompilationHint(std::shared_ptr<RNSkPlatformContext> context,
                                 wgpu::ShaderModuleCompilationHint m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::ShaderModuleCompilationHint>(
            context,
            std::make_shared<wgpu::ShaderModuleCompilationHint>(std::move(m))) {
  }

  EXPORT_JSI_API_TYPENAME(JsiShaderModuleCompilationHint,
                          ShaderModuleCompilationHint)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::ShaderModuleCompilationHint>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiShaderModuleCompilationHint>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
