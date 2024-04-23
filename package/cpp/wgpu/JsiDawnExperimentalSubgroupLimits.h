#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiDawnExperimentalSubgroupLimits
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::DawnExperimentalSubgroupLimits> {
public:
  JsiDawnExperimentalSubgroupLimits(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::DawnExperimentalSubgroupLimits m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::DawnExperimentalSubgroupLimits>(
            context, std::make_shared<wgpu::DawnExperimentalSubgroupLimits>(
                         std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiDawnExperimentalSubgroupLimits,
                          DawnExperimentalSubgroupLimits)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::DawnExperimentalSubgroupLimits>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiDawnExperimentalSubgroupLimits>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
