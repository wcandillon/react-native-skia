#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiDawnEncoderInternalUsageDescriptor
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::DawnEncoderInternalUsageDescriptor> {
public:
  JsiDawnEncoderInternalUsageDescriptor(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::DawnEncoderInternalUsageDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::DawnEncoderInternalUsageDescriptor>(
            context, std::make_shared<wgpu::DawnEncoderInternalUsageDescriptor>(
                         std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiDawnEncoderInternalUsageDescriptor,
                          DawnEncoderInternalUsageDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::DawnEncoderInternalUsageDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiDawnEncoderInternalUsageDescriptor>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
