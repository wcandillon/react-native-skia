#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiLimits : public JsiSkWrappingSharedPtrHostObject<wgpu::Limits> {
public:
  JsiLimits(std::shared_ptr<RNSkPlatformContext> context, wgpu::Limits m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Limits>(
            context, std::make_shared<wgpu::Limits>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiLimits, Limits)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::Limits> fromValue(jsi::Runtime &runtime,
                                                 const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiLimits>(runtime)->getObject();
  }
};
} // namespace RNSkia
