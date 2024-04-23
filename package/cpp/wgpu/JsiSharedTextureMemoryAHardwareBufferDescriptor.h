#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSharedTextureMemoryAHardwareBufferDescriptor
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SharedTextureMemoryAHardwareBufferDescriptor> {
public:
  JsiSharedTextureMemoryAHardwareBufferDescriptor(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::SharedTextureMemoryAHardwareBufferDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::SharedTextureMemoryAHardwareBufferDescriptor>(
            context, std::make_shared<
                         wgpu::SharedTextureMemoryAHardwareBufferDescriptor>(
                         std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSharedTextureMemoryAHardwareBufferDescriptor,
                          SharedTextureMemoryAHardwareBufferDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SharedTextureMemoryAHardwareBufferDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object
        .asHostObject<JsiSharedTextureMemoryAHardwareBufferDescriptor>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
