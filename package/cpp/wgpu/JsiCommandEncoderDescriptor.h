#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiCommandEncoderDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::CommandEncoderDescriptor> {
public:
  JsiCommandEncoderDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                              wgpu::CommandEncoderDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::CommandEncoderDescriptor>(
            context,
            std::make_shared<wgpu::CommandEncoderDescriptor>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiCommandEncoderDescriptor, CommandEncoderDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::CommandEncoderDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiCommandEncoderDescriptor>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
