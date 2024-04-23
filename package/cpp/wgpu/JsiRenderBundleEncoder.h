#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiBindGroup.h"
#include "JsiBuffer.h"
#include "JsiRenderBundle.h"
#include "JsiRenderBundleDescriptor.h"
#include "JsiRenderPipeline.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiRenderBundleEncoder
    : public JsiSkWrappingSharedPtrHostObject<wgpu::RenderBundleEncoder> {
public:
  JsiRenderBundleEncoder(std::shared_ptr<RNSkPlatformContext> context,
                         wgpu::RenderBundleEncoder m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::RenderBundleEncoder>(
            context,
            std::make_shared<wgpu::RenderBundleEncoder>(std::move(m))) {}

  JSI_HOST_FUNCTION(setPipeline) {
    auto pipeline = JsiRenderPipeline::fromValue(runtime, arguments[0]);
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

  JSI_HOST_FUNCTION(draw) {
    auto vertexCount = vertexCount.asNumber();
    auto instanceCount = instanceCount.asNumber();
    auto firstVertex = firstVertex.asNumber();
    auto firstInstance = firstInstance.asNumber();
    getObject()->draw(*vertex count.get(), *instance count.get(),
                      *first vertex.get(), *first instance.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawIndexed) {
    auto indexCount = indexCount.asNumber();
    auto instanceCount = instanceCount.asNumber();
    auto firstIndex = firstIndex.asNumber();
    auto baseVertex = JsiInt32T::fromValue(runtime, arguments[3]);
    auto firstInstance = firstInstance.asNumber();
    getObject()->drawIndexed(*index count.get(), *instance count.get(),
                             *first index.get(), *base vertex.get(),
                             *first instance.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawIndirect) {
    auto indirectBuffer = JsiBuffer::fromValue(runtime, arguments[0]);
    auto indirectOffset = JsiUint64T::fromValue(runtime, arguments[1]);
    getObject()->drawIndirect(*indirect buffer.get(), *indirect offset.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawIndexedIndirect) {
    auto indirectBuffer = JsiBuffer::fromValue(runtime, arguments[0]);
    auto indirectOffset = JsiUint64T::fromValue(runtime, arguments[1]);
    getObject()->drawIndexedIndirect(*indirect buffer.get(),
                                     *indirect offset.get());
    return jsi::Value::undefined();
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

  JSI_HOST_FUNCTION(setVertexBuffer) {
    auto slot = slot.asNumber();
    auto buffer =
        count > 1 ? JsiBuffer::fromValue(runtime, arguments[1]) : defaultBuffer;
    auto offset = JsiUint64T::fromValue(runtime, arguments[2]);
    auto size = JsiUint64T::fromValue(runtime, arguments[3]);
    getObject()->setVertexBuffer(*slot.get(), *buffer.get(), *offset.get(),
                                 *size.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(setIndexBuffer) {
    auto buffer = JsiBuffer::fromValue(runtime, arguments[0]);
    auto format = JsiIndexFormat::fromValue(runtime, arguments[1]);
    auto offset = JsiUint64T::fromValue(runtime, arguments[2]);
    auto size = JsiUint64T::fromValue(runtime, arguments[3]);
    getObject()->setIndexBuffer(*buffer.get(), *format.get(), *offset.get(),
                                *size.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(finish) {
    auto descriptor =
        count > 0 ? JsiRenderBundleDescriptor::fromValue(runtime, arguments[0])
                  : defaultDescriptor;
    auto ret = getObject()->finish(*descriptor.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiRenderBundle>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(setLabel) {
    auto label = JsiChar::fromValue(runtime, arguments[0]);
    auto ret = getObject()->setLabel(*label.get());
    return jsi::Value(ret);
  }

  EXPORT_JSI_API_TYPENAME(JsiRenderBundleEncoder, RenderBundleEncoder)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiRenderBundleEncoder, setPipeline),
                       JSI_EXPORT_FUNC(JsiRenderBundleEncoder, setBindGroup),
                       JSI_EXPORT_FUNC(JsiRenderBundleEncoder, draw),
                       JSI_EXPORT_FUNC(JsiRenderBundleEncoder, drawIndexed),
                       JSI_EXPORT_FUNC(JsiRenderBundleEncoder, drawIndirect),
                       JSI_EXPORT_FUNC(JsiRenderBundleEncoder,
                                       drawIndexedIndirect),
                       JSI_EXPORT_FUNC(JsiRenderBundleEncoder,
                                       insertDebugMarker),
                       JSI_EXPORT_FUNC(JsiRenderBundleEncoder, popDebugGroup),
                       JSI_EXPORT_FUNC(JsiRenderBundleEncoder, pushDebugGroup),
                       JSI_EXPORT_FUNC(JsiRenderBundleEncoder, setVertexBuffer),
                       JSI_EXPORT_FUNC(JsiRenderBundleEncoder, setIndexBuffer),
                       JSI_EXPORT_FUNC(JsiRenderBundleEncoder, finish),
                       JSI_EXPORT_FUNC(JsiRenderBundleEncoder, setLabel))

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::RenderBundleEncoder>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiRenderBundleEncoder>(runtime)->getObject();
  }
};
} // namespace RNSkia
