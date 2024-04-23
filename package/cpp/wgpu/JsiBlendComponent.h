#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiBlendComponent
    : public JsiSkWrappingSharedPtrHostObject<wgpu::BlendComponent> {
public:
  JsiBlendComponent(std::shared_ptr<RNSkPlatformContext> context,
                    wgpu::BlendComponent m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::BlendComponent>(
            context, std::make_shared<wgpu::BlendComponent>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiBlendComponent, BlendComponent)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::BlendComponent>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiBlendComponent>(runtime)->getObject();
  }
};
} // namespace RNSkia
