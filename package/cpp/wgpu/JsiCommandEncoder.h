#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiBuffer.h"
#include "JsiCommandBuffer.h"
#include "JsiCommandBufferDescriptor.h"
#include "JsiComputePassDescriptor.h"
#include "JsiComputePassEncoder.h"
#include "JsiExtent3D.h"
#include "JsiImageCopyBuffer.h"
#include "JsiImageCopyTexture.h"
#include "JsiQuerySet.h"
#include "JsiRenderPassDescriptor.h"
#include "JsiRenderPassEncoder.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiCommandEncoder
    : public JsiSkWrappingSharedPtrHostObject<wgpu::CommandEncoder> {
public:
  JsiCommandEncoder(std::shared_ptr<RNSkPlatformContext> context,
                    wgpu::CommandEncoder m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::CommandEncoder>(
            context, std::make_shared<wgpu::CommandEncoder>(std::move(m))) {}

  JSI_HOST_FUNCTION(finish) {
    auto descriptor =
        count > 0 ? JsiCommandBufferDescriptor::fromValue(runtime, arguments[0])
                  : defaultDescriptor;
    auto ret = getObject()->finish(*descriptor.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiCommandBuffer>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(beginComputePass) {
    auto descriptor =
        count > 0 ? JsiComputePassDescriptor::fromValue(runtime, arguments[0])
                  : defaultDescriptor;
    auto ret = getObject()->beginComputePass(*descriptor.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiComputePassEncoder>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(beginRenderPass) {
    auto descriptor = JsiRenderPassDescriptor::fromValue(runtime, arguments[0]);
    auto ret = getObject()->beginRenderPass(*descriptor.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiRenderPassEncoder>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(copyBufferToBuffer) {
    auto source = JsiBuffer::fromValue(runtime, arguments[0]);
    auto sourceOffset = JsiUint64T::fromValue(runtime, arguments[1]);
    auto destination = JsiBuffer::fromValue(runtime, arguments[2]);
    auto destinationOffset = JsiUint64T::fromValue(runtime, arguments[3]);
    auto size = JsiUint64T::fromValue(runtime, arguments[4]);
    getObject()->copyBufferToBuffer(*source.get(), *source offset.get(),
                                    *destination.get(),
                                    *destination offset.get(), *size.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(copyBufferToTexture) {
    auto source = JsiImageCopyBuffer::fromValue(runtime, arguments[0]);
    auto destination = JsiImageCopyTexture::fromValue(runtime, arguments[1]);
    auto copySize = JsiExtent3D::fromValue(runtime, arguments[2]);
    getObject()->copyBufferToTexture(*source.get(), *destination.get(),
                                     *copy size.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(copyTextureToBuffer) {
    auto source = JsiImageCopyTexture::fromValue(runtime, arguments[0]);
    auto destination = JsiImageCopyBuffer::fromValue(runtime, arguments[1]);
    auto copySize = JsiExtent3D::fromValue(runtime, arguments[2]);
    getObject()->copyTextureToBuffer(*source.get(), *destination.get(),
                                     *copy size.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(copyTextureToTexture) {
    auto source = JsiImageCopyTexture::fromValue(runtime, arguments[0]);
    auto destination = JsiImageCopyTexture::fromValue(runtime, arguments[1]);
    auto copySize = JsiExtent3D::fromValue(runtime, arguments[2]);
    getObject()->copyTextureToTexture(*source.get(), *destination.get(),
                                      *copy size.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(clearBuffer) {
    auto buffer = JsiBuffer::fromValue(runtime, arguments[0]);
    auto offset = JsiUint64T::fromValue(runtime, arguments[1]);
    auto size = JsiUint64T::fromValue(runtime, arguments[2]);
    getObject()->clearBuffer(*buffer.get(), *offset.get(), *size.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(injectValidationError) {
    auto message = JsiChar::fromValue(runtime, arguments[0]);
    getObject()->injectValidationError(*message.get());
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

  JSI_HOST_FUNCTION(resolveQuerySet) {
    auto querySet = JsiQuerySet::fromValue(runtime, arguments[0]);
    auto firstQuery = firstQuery.asNumber();
    auto queryCount = queryCount.asNumber();
    auto destination = JsiBuffer::fromValue(runtime, arguments[3]);
    auto destinationOffset = JsiUint64T::fromValue(runtime, arguments[4]);
    getObject()->resolveQuerySet(*query set.get(), *first query.get(),
                                 *query count.get(), *destination.get(),
                                 *destination offset.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(writeBuffer) {
    auto buffer = JsiBuffer::fromValue(runtime, arguments[0]);
    auto bufferOffset = JsiUint64T::fromValue(runtime, arguments[1]);
    auto data = JsiUint8T::fromValue(runtime, arguments[2]);
    auto size = JsiUint64T::fromValue(runtime, arguments[3]);
    getObject()->writeBuffer(*buffer.get(), *buffer offset.get(), *data.get(),
                             *size.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(writeTimestamp) {
    auto querySet = JsiQuerySet::fromValue(runtime, arguments[0]);
    auto queryIndex = queryIndex.asNumber();
    getObject()->writeTimestamp(*query set.get(), *query index.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(setLabel) {
    auto label = JsiChar::fromValue(runtime, arguments[0]);
    auto ret = getObject()->setLabel(*label.get());
    return jsi::Value(ret);
  }

  EXPORT_JSI_API_TYPENAME(JsiCommandEncoder, CommandEncoder)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiCommandEncoder, finish),
                       JSI_EXPORT_FUNC(JsiCommandEncoder, beginComputePass),
                       JSI_EXPORT_FUNC(JsiCommandEncoder, beginRenderPass),
                       JSI_EXPORT_FUNC(JsiCommandEncoder, copyBufferToBuffer),
                       JSI_EXPORT_FUNC(JsiCommandEncoder, copyBufferToTexture),
                       JSI_EXPORT_FUNC(JsiCommandEncoder, copyTextureToBuffer),
                       JSI_EXPORT_FUNC(JsiCommandEncoder, copyTextureToTexture),
                       JSI_EXPORT_FUNC(JsiCommandEncoder, clearBuffer),
                       JSI_EXPORT_FUNC(JsiCommandEncoder,
                                       injectValidationError),
                       JSI_EXPORT_FUNC(JsiCommandEncoder, insertDebugMarker),
                       JSI_EXPORT_FUNC(JsiCommandEncoder, popDebugGroup),
                       JSI_EXPORT_FUNC(JsiCommandEncoder, pushDebugGroup),
                       JSI_EXPORT_FUNC(JsiCommandEncoder, resolveQuerySet),
                       JSI_EXPORT_FUNC(JsiCommandEncoder, writeBuffer),
                       JSI_EXPORT_FUNC(JsiCommandEncoder, writeTimestamp),
                       JSI_EXPORT_FUNC(JsiCommandEncoder, setLabel))

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::CommandEncoder>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiCommandEncoder>(runtime)->getObject();
  }
};
} // namespace RNSkia
