#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiPrimitiveState
    : public JsiSkWrappingSharedPtrHostObject<wgpu::PrimitiveState> {
public:
  JsiPrimitiveState(std::shared_ptr<RNSkPlatformContext> context,
                    wgpu::PrimitiveState m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::PrimitiveState>(
            context, std::make_shared<wgpu::PrimitiveState>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiPrimitiveState, PrimitiveState)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::PrimitiveState>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiPrimitiveState>(runtime)->getObject();
  }
};
} // namespace RNSkia
