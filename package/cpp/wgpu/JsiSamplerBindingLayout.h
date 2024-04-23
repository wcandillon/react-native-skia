#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSamplerBindingLayout
    : public JsiSkWrappingSharedPtrHostObject<wgpu::SamplerBindingLayout> {
public:
  JsiSamplerBindingLayout(std::shared_ptr<RNSkPlatformContext> context,
                          wgpu::SamplerBindingLayout m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::SamplerBindingLayout>(
            context,
            std::make_shared<wgpu::SamplerBindingLayout>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSamplerBindingLayout, SamplerBindingLayout)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SamplerBindingLayout>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiSamplerBindingLayout>(runtime)->getObject();
  }
};
} // namespace RNSkia
