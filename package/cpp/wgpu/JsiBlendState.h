#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiBlendComponent.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiBlendState
    : public JsiSkWrappingSharedPtrHostObject<wgpu::BlendState> {
public:
  JsiBlendState(std::shared_ptr<RNSkPlatformContext> context,
                wgpu::BlendState m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::BlendState>(
            context, std::make_shared<wgpu::BlendState>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiBlendState, BlendState)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::BlendState> fromValue(jsi::Runtime &runtime,
                                                     const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiBlendState>(runtime)->getObject();
  }
};
} // namespace RNSkia
