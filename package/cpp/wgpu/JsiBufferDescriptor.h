#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiBufferDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::BufferDescriptor> {
public:
  JsiBufferDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                      wgpu::BufferDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::BufferDescriptor>(
            context, std::make_shared<wgpu::BufferDescriptor>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiBufferDescriptor, BufferDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::BufferDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiBufferDescriptor>(runtime)->getObject();
  }
};
} // namespace RNSkia
