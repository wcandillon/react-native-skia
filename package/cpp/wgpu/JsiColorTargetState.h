#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiBlendState.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiColorTargetState
    : public JsiSkWrappingSharedPtrHostObject<wgpu::ColorTargetState> {
public:
  JsiColorTargetState(std::shared_ptr<RNSkPlatformContext> context,
                      wgpu::ColorTargetState m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::ColorTargetState>(
            context, std::make_shared<wgpu::ColorTargetState>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiColorTargetState, ColorTargetState)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::ColorTargetState>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiColorTargetState>(runtime)->getObject();
  }
};
} // namespace RNSkia
