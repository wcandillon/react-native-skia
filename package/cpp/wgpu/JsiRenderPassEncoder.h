#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiBindGroup.h"
#include "JsiBuffer.h"
#include "JsiColor.h"
#include "JsiQuerySet.h"
#include "JsiRenderBundle.h"
#include "JsiRenderPipeline.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiRenderPassEncoder
    : public JsiSkWrappingSharedPtrHostObject<wgpu::RenderPassEncoder> {
public:
  JsiRenderPassEncoder(std::shared_ptr<RNSkPlatformContext> context,
                       wgpu::RenderPassEncoder m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::RenderPassEncoder>(
            context, std::make_shared<wgpu::RenderPassEncoder>(std::move(m))) {}

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

  JSI_HOST_FUNCTION(executeBundles) {
    auto bundleCount = JsiSizeT::fromValue(runtime, arguments[0]);
    auto bundles = JsiRenderBundle::fromValue(runtime, arguments[1]);
    getObject()->executeBundles(*bundle count.get(), *bundles.get());
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

  JSI_HOST_FUNCTION(setStencilReference) {
    auto reference = reference.asNumber();
    getObject()->setStencilReference(*reference.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(setBlendConstant) {
    auto color = JsiColor::fromValue(runtime, arguments[0]);
    getObject()->setBlendConstant(*color.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(setViewport) {
    auto x = JsiFloat::fromValue(runtime, arguments[0]);
    auto y = JsiFloat::fromValue(runtime, arguments[1]);
    auto width = JsiFloat::fromValue(runtime, arguments[2]);
    auto height = JsiFloat::fromValue(runtime, arguments[3]);
    auto minDepth = JsiFloat::fromValue(runtime, arguments[4]);
    auto maxDepth = JsiFloat::fromValue(runtime, arguments[5]);
    getObject()->setViewport(*x.get(), *y.get(), *width.get(), *height.get(),
                             *min depth.get(), *max depth.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(setScissorRect) {
    auto x = x.asNumber();
    auto y = y.asNumber();
    auto width = width.asNumber();
    auto height = height.asNumber();
    getObject()->setScissorRect(*x.get(), *y.get(), *width.get(),
                                *height.get());
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

  JSI_HOST_FUNCTION(beginOcclusionQuery) {
    auto queryIndex = queryIndex.asNumber();
    getObject()->beginOcclusionQuery(*query index.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(endOcclusionQuery) {

    getObject()->endOcclusionQuery();
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(writeTimestamp) {
    auto querySet = JsiQuerySet::fromValue(runtime, arguments[0]);
    auto queryIndex = queryIndex.asNumber();
    getObject()->writeTimestamp(*query set.get(), *query index.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(pixelLocalStorageBarrier) {

    getObject()->pixelLocalStorageBarrier();
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

  EXPORT_JSI_API_TYPENAME(JsiRenderPassEncoder, RenderPassEncoder)

  JSI_EXPORT_FUNCTIONS(
      JSI_EXPORT_FUNC(JsiRenderPassEncoder, setPipeline),
      JSI_EXPORT_FUNC(JsiRenderPassEncoder, setBindGroup),
      JSI_EXPORT_FUNC(JsiRenderPassEncoder, draw),
      JSI_EXPORT_FUNC(JsiRenderPassEncoder, drawIndexed),
      JSI_EXPORT_FUNC(JsiRenderPassEncoder, drawIndirect),
      JSI_EXPORT_FUNC(JsiRenderPassEncoder, drawIndexedIndirect),
      JSI_EXPORT_FUNC(JsiRenderPassEncoder, executeBundles),
      JSI_EXPORT_FUNC(JsiRenderPassEncoder, insertDebugMarker),
      JSI_EXPORT_FUNC(JsiRenderPassEncoder, popDebugGroup),
      JSI_EXPORT_FUNC(JsiRenderPassEncoder, pushDebugGroup),
      JSI_EXPORT_FUNC(JsiRenderPassEncoder, setStencilReference),
      JSI_EXPORT_FUNC(JsiRenderPassEncoder, setBlendConstant),
      JSI_EXPORT_FUNC(JsiRenderPassEncoder, setViewport),
      JSI_EXPORT_FUNC(JsiRenderPassEncoder, setScissorRect),
      JSI_EXPORT_FUNC(JsiRenderPassEncoder, setVertexBuffer),
      JSI_EXPORT_FUNC(JsiRenderPassEncoder, setIndexBuffer),
      JSI_EXPORT_FUNC(JsiRenderPassEncoder, beginOcclusionQuery),
      JSI_EXPORT_FUNC(JsiRenderPassEncoder, endOcclusionQuery),
      JSI_EXPORT_FUNC(JsiRenderPassEncoder, writeTimestamp),
      JSI_EXPORT_FUNC(JsiRenderPassEncoder, pixelLocalStorageBarrier),
      JSI_EXPORT_FUNC(JsiRenderPassEncoder, end),
      JSI_EXPORT_FUNC(JsiRenderPassEncoder, setLabel))

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::RenderPassEncoder>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiRenderPassEncoder>(runtime)->getObject();
  }
};
} // namespace RNSkia
