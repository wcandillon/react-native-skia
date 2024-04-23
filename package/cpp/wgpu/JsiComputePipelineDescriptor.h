#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiPipelineLayout.h"
#include "JsiProgrammableStageDescriptor.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiComputePipelineDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::ComputePipelineDescriptor> {
public:
  JsiComputePipelineDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                               wgpu::ComputePipelineDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::ComputePipelineDescriptor>(
            context,
            std::make_shared<wgpu::ComputePipelineDescriptor>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiComputePipelineDescriptor,
                          ComputePipelineDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::ComputePipelineDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiComputePipelineDescriptor>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
