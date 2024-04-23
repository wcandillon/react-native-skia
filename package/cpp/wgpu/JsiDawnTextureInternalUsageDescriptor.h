#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiDawnTextureInternalUsageDescriptor
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::DawnTextureInternalUsageDescriptor> {
public:
  JsiDawnTextureInternalUsageDescriptor(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::DawnTextureInternalUsageDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::DawnTextureInternalUsageDescriptor>(
            context, std::make_shared<wgpu::DawnTextureInternalUsageDescriptor>(
                         std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiDawnTextureInternalUsageDescriptor,
                          DawnTextureInternalUsageDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::DawnTextureInternalUsageDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiDawnTextureInternalUsageDescriptor>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
