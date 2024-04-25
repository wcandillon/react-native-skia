#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiSkHostObjects.h"

#include "JsiDevice.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiWGPUContext
    : public JsiSkWrappingSharedPtrHostObject<WGPUSurfaceDescriptor> {
public:
  JsiWGPUContext(std::shared_ptr<RNSkPlatformContext> context,
                 std::shared_ptr<WGPUSurfaceDescriptor> m)
      : JsiSkWrappingSharedPtrHostObject<WGPUSurfaceDescriptor>(
            context, std::move(m)) {}

  JSI_HOST_FUNCTION(configure) {
    auto device = JsiDevice::fromValue(runtime, arguments[0]);
    return jsi::Value::undefined();
  }

  EXPORT_JSI_API_TYPENAME(JsiWGPUContext, WGPUContext)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiWGPUContext, configure))

};
}// namespace RNSkia