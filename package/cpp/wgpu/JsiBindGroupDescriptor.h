#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiBindGroupEntry.h"
#include "JsiBindGroupLayout.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiBindGroupDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::BindGroupDescriptor> {
public:
  JsiBindGroupDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                         wgpu::BindGroupDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::BindGroupDescriptor>(
            context,
            std::make_shared<wgpu::BindGroupDescriptor>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiBindGroupDescriptor, BindGroupDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::BindGroupDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiBindGroupDescriptor>(runtime)->getObject();
  }
};
} // namespace RNSkia
