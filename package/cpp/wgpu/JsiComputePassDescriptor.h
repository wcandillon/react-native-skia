#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiComputePassTimestampWrites.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiComputePassDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::ComputePassDescriptor> {
public:
  JsiComputePassDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                           wgpu::ComputePassDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::ComputePassDescriptor>(
            context,
            std::make_shared<wgpu::ComputePassDescriptor>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiComputePassDescriptor, ComputePassDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::ComputePassDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiComputePassDescriptor>(runtime)->getObject();
  }
};
} // namespace RNSkia
