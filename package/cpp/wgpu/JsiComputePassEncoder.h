#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiBindGroup.h"
#include "JsiBuffer.h"
#include "JsiComputePipeline.h"
#include "JsiQuerySet.h"

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

  JSI_HOST_FUNCTION(insertDebugMarker) {
    auto markerLabel = JsiChar::fromValue(runtime, arguments[0]);
    getObject()->insertDebugMarker(*marker label.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(popDebugGroup) {

    getObject()->popDebugGroup();
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(pushDebugGroup) {
    auto groupLabel = JsiChar::fromValue(runtime, arguments[0]);
    getObject()->pushDebugGroup(*group label.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(setPipeline) {
    auto pipeline = JsiComputePipeline::fromValue(runtime, arguments[0]);
    getObject()->setPipeline(*pipeline.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(setBindGroup) {
    auto groupIndex = groupIndex.asNumber();
    auto group = count > 1 ? JsiBindGroup::fromValue(runtime, arguments[1])
                           : defaultGroup;
    auto dynamicOffsetCount = JsiSizeT::fromValue(runtime, arguments[2]);
    auto dynamicOffsets = dynamicOffsets.asNumber();
    getObject()->setBindGroup(*group index.get(), *group.get(),
                              *dynamic offset count.get(),
                              *dynamic offsets.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(writeTimestamp) {
    auto querySet = JsiQuerySet::fromValue(runtime, arguments[0]);
    auto queryIndex = queryIndex.asNumber();
    getObject()->writeTimestamp(*query set.get(), *query index.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(dispatchWorkgroups) {
    auto workgroupCountX = workgroupCountX.asNumber();
    auto workgroupCountY = workgroupCountY.asNumber();
    auto workgroupCountZ = workgroupCountZ.asNumber();
    getObject()->dispatchWorkgroups(
        *workgroupCountX.get(), *workgroupCountY.get(), *workgroupCountZ.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(dispatchWorkgroupsIndirect) {
    auto indirectBuffer = JsiBuffer::fromValue(runtime, arguments[0]);
    auto indirectOffset = JsiUint64T::fromValue(runtime, arguments[1]);
    getObject()->dispatchWorkgroupsIndirect(*indirect buffer.get(),
                                            *indirect offset.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(end) {

    getObject()->end();
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(setLabel) {
    auto label = JsiChar::fromValue(runtime, arguments[0]);
    auto ret = getObject()->setLabel(*label.get());
    return jsi::Value(ret);
  }

  EXPORT_JSI_API_TYPENAME(JsiComputePassEncoder, ComputePassEncoder)

  JSI_EXPORT_FUNCTIONS(
      JSI_EXPORT_FUNC(JsiComputePassEncoder, insertDebugMarker),
      JSI_EXPORT_FUNC(JsiComputePassEncoder, popDebugGroup),
      JSI_EXPORT_FUNC(JsiComputePassEncoder, pushDebugGroup),
      JSI_EXPORT_FUNC(JsiComputePassEncoder, setPipeline),
      JSI_EXPORT_FUNC(JsiComputePassEncoder, setBindGroup),
      JSI_EXPORT_FUNC(JsiComputePassEncoder, writeTimestamp),
      JSI_EXPORT_FUNC(JsiComputePassEncoder, dispatchWorkgroups),
      JSI_EXPORT_FUNC(JsiComputePassEncoder, dispatchWorkgroupsIndirect),
      JSI_EXPORT_FUNC(JsiComputePassEncoder, end),
      JSI_EXPORT_FUNC(JsiComputePassEncoder, setLabel))

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::ComputePassEncoder>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiComputePassEncoder>(runtime)->getObject();
  }
};
} // namespace RNSkia
