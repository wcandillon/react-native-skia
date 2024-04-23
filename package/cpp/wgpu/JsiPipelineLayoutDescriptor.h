#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiBindGroupLayout.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiPipelineLayoutDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::PipelineLayoutDescriptor> {
public:
  JsiPipelineLayoutDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                              wgpu::PipelineLayoutDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::PipelineLayoutDescriptor>(
            context,
            std::make_shared<wgpu::PipelineLayoutDescriptor>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiPipelineLayoutDescriptor, PipelineLayoutDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::PipelineLayoutDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiPipelineLayoutDescriptor>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
