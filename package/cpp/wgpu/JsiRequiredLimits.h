#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiLimits.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiRequiredLimits
    : public JsiSkWrappingSharedPtrHostObject<wgpu::RequiredLimits> {
public:
  JsiRequiredLimits(std::shared_ptr<RNSkPlatformContext> context,
                    wgpu::RequiredLimits m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::RequiredLimits>(
            context, std::make_shared<wgpu::RequiredLimits>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiRequiredLimits, RequiredLimits)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::RequiredLimits>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiRequiredLimits>(runtime)->getObject();
  }
};
} // namespace RNSkia
