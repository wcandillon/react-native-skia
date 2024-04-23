#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSharedTextureMemoryVkDedicatedAllocationDescriptor
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SharedTextureMemoryVkDedicatedAllocationDescriptor> {
public:
  JsiSharedTextureMemoryVkDedicatedAllocationDescriptor(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::SharedTextureMemoryVkDedicatedAllocationDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::SharedTextureMemoryVkDedicatedAllocationDescriptor>(
            context,
            std::make_shared<
                wgpu::SharedTextureMemoryVkDedicatedAllocationDescriptor>(
                std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSharedTextureMemoryVkDedicatedAllocationDescriptor,
                          SharedTextureMemoryVkDedicatedAllocationDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<
      wgpu::SharedTextureMemoryVkDedicatedAllocationDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object
        .asHostObject<JsiSharedTextureMemoryVkDedicatedAllocationDescriptor>(
            runtime)
        ->getObject();
  }
};
} // namespace RNSkia
