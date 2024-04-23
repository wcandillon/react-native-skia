#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiInstanceFeatures
    : public JsiSkWrappingSharedPtrHostObject<wgpu::InstanceFeatures> {
public:
  JsiInstanceFeatures(std::shared_ptr<RNSkPlatformContext> context,
                      wgpu::InstanceFeatures m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::InstanceFeatures>(
            context, std::make_shared<wgpu::InstanceFeatures>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiInstanceFeatures, InstanceFeatures)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::InstanceFeatures>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiInstanceFeatures>(runtime)->getObject();
  }
};
} // namespace RNSkia
