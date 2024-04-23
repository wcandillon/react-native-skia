#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiInstanceFeatures.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiInstanceDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::InstanceDescriptor> {
public:
  JsiInstanceDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                        wgpu::InstanceDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::InstanceDescriptor>(
            context, std::make_shared<wgpu::InstanceDescriptor>(std::move(m))) {
  }

  EXPORT_JSI_API_TYPENAME(JsiInstanceDescriptor, InstanceDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::InstanceDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiInstanceDescriptor>(runtime)->getObject();
  }
};
} // namespace RNSkia
