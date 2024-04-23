#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiQuerySet.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiComputePassTimestampWrites : public JsiSkWrappingSharedPtrHostObject<
                                          wgpu::ComputePassTimestampWrites> {
public:
  JsiComputePassTimestampWrites(std::shared_ptr<RNSkPlatformContext> context,
                                wgpu::ComputePassTimestampWrites m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::ComputePassTimestampWrites>(
            context,
            std::make_shared<wgpu::ComputePassTimestampWrites>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiComputePassTimestampWrites,
                          ComputePassTimestampWrites)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::ComputePassTimestampWrites>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiComputePassTimestampWrites>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
