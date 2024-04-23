#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiDawnTogglesDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::DawnTogglesDescriptor> {
public:
  JsiDawnTogglesDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                           wgpu::DawnTogglesDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::DawnTogglesDescriptor>(
            context,
            std::make_shared<wgpu::DawnTogglesDescriptor>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiDawnTogglesDescriptor, DawnTogglesDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::DawnTogglesDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiDawnTogglesDescriptor>(runtime)->getObject();
  }
};
} // namespace RNSkia
