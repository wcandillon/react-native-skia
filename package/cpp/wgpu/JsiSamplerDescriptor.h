#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSamplerDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::SamplerDescriptor> {
public:
  JsiSamplerDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                       wgpu::SamplerDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::SamplerDescriptor>(
            context, std::make_shared<wgpu::SamplerDescriptor>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSamplerDescriptor, SamplerDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SamplerDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiSamplerDescriptor>(runtime)->getObject();
  }
};
} // namespace RNSkia
