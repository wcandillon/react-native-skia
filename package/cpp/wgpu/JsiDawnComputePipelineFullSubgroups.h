#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiDawnComputePipelineFullSubgroups
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::DawnComputePipelineFullSubgroups> {
public:
  JsiDawnComputePipelineFullSubgroups(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::DawnComputePipelineFullSubgroups m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::DawnComputePipelineFullSubgroups>(
            context, std::make_shared<wgpu::DawnComputePipelineFullSubgroups>(
                         std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiDawnComputePipelineFullSubgroups,
                          DawnComputePipelineFullSubgroups)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::DawnComputePipelineFullSubgroups>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiDawnComputePipelineFullSubgroups>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
