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

class JsiSupportedLimits
    : public JsiSkWrappingSharedPtrHostObject<wgpu::SupportedLimits> {
public:
  JsiSupportedLimits(std::shared_ptr<RNSkPlatformContext> context,
                     wgpu::SupportedLimits m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::SupportedLimits>(
            context, std::make_shared<wgpu::SupportedLimits>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSupportedLimits, SupportedLimits)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SupportedLimits>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiSupportedLimits>(runtime)->getObject();
  }
};
} // namespace RNSkia
