#pragma once
#include <memory>
#include <string>
#include <utility>

#include "dawn/webgpu_cpp.h"

#include <jsi/jsi.h>

#include "JsiBindGroup.h"
#include "JsiComputePipeline.h"
#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "JsiTextureView.h"
#include "MutableJSIBuffer.h"
#include "RNSkLog.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiComputePassEncoder
    : public JsiSkWrappingSharedPtrHostObject<wgpu::ComputePassEncoder> {
public:
  JsiComputePassEncoder(std::shared_ptr<RNSkPlatformContext> context,
                        wgpu::ComputePassEncoder m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::ComputePassEncoder>(
            context, std::make_shared<wgpu::ComputePassEncoder>(std::move(m))) {
  }

  JSI_HOST_FUNCTION(setPipeline) {
    auto pipeline = JsiComputePipeline::fromValue(runtime, arguments[0]);

    getObject()->SetPipeline(*pipeline);

    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(setBindGroup) {
    auto index = static_cast<uint32_t>(arguments[0].getNumber());
    auto bindGroup = JsiBindGroup::fromValue(runtime, arguments[1]);
    // auto dynamicOffsetCount = static_cast<size_t>(arguments[2].getNumber());
    getObject()->SetBindGroup(index, *bindGroup, 0, nullptr);
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(dispatchWorkgroups) {
    auto x = static_cast<uint32_t>(arguments[0].getNumber());
    uint32_t defaultY = 1;
    auto y =
        count > 1 ? static_cast<uint32_t>(arguments[1].getNumber()) : defaultY;
    uint32_t defaultZ = 1;
    auto z =
        count > 2 ? static_cast<uint32_t>(arguments[2].getNumber()) : defaultZ;

    getObject()->DispatchWorkgroups(x, y, z);

    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(end) {

    getObject()->End();

    return jsi::Value::undefined();
  }

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiComputePassEncoder, ComputePassEncoder)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiComputePassEncoder, setPipeline),
                       JSI_EXPORT_FUNC(JsiComputePassEncoder, setBindGroup),
                       JSI_EXPORT_FUNC(JsiComputePassEncoder,
                                       dispatchWorkgroups),
                       JSI_EXPORT_FUNC(JsiComputePassEncoder, end))

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::ComputePassEncoder *fromValue(jsi::Runtime &runtime,
                                             const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiComputePassEncoder>(runtime)
          ->getObject()
          .get();
    } else {
      throw jsi::JSError(runtime,
                         "Expected a JsiComputePassEncoder object, but got a " +
                             raw.toString(runtime).utf8(runtime));
    }
  }
};
} // namespace RNSkia
