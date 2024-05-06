#pragma once
#include <memory>
#include <string>
#include <utility>

#include "dawn/webgpu_cpp.h"

#include <jsi/jsi.h>

#include "JsiBuffer.h"
#include "JsiCommandBuffer.h"
#include "JsiComputePassDescriptor.h"
#include "JsiComputePassEncoder.h"
#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiRenderPassDescriptor.h"
#include "JsiRenderPassEncoder.h"
#include "JsiSkHostObjects.h"
#include "JsiTextureView.h"
#include "MutableJSIBuffer.h"
#include "RNSkLog.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiCommandEncoder
    : public JsiSkWrappingSharedPtrHostObject<wgpu::CommandEncoder> {
public:
  JsiCommandEncoder(std::shared_ptr<RNSkPlatformContext> context,
                    wgpu::CommandEncoder m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::CommandEncoder>(
            context, std::make_shared<wgpu::CommandEncoder>(std::move(m))) {}

  JSI_HOST_FUNCTION(beginRenderPass) {
    auto descriptor = JsiRenderPassDescriptor::fromValue(runtime, arguments[0]);

    auto ret = getObject()->BeginRenderPass(descriptor);
    if (ret == nullptr) {
      throw jsi::JSError(runtime, "beginRenderPass returned null");
    }
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiRenderPassEncoder>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(finish) {

    auto ret = getObject()->Finish();
    if (ret == nullptr) {
      throw jsi::JSError(runtime, "finish returned null");
    }
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiCommandBuffer>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(beginComputePass) {

    auto defaultDescriptor = new wgpu::ComputePassDescriptor();
    auto descriptor =
        count > 0 ? JsiComputePassDescriptor::fromValue(runtime, arguments[0])
                  : defaultDescriptor;

    auto ret = getObject()->BeginComputePass(descriptor);
    if (ret == nullptr) {
      throw jsi::JSError(runtime, "beginComputePass returned null");
    }
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiComputePassEncoder>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(copyBufferToBuffer) {
    auto source = JsiBuffer::fromValue(runtime, arguments[0]);
    auto sourceOffset = static_cast<uint32_t>(arguments[1].getNumber());
    auto destination = JsiBuffer::fromValue(runtime, arguments[2]);
    auto destinationOffset = static_cast<uint32_t>(arguments[3].getNumber());
    auto size = static_cast<uint32_t>(arguments[4].getNumber());

    getObject()->CopyBufferToBuffer(*source, sourceOffset, *destination,
                                    destinationOffset, size);

    return jsi::Value::undefined();
  }

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiCommandEncoder, CommandEncoder)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiCommandEncoder, beginRenderPass),
                       JSI_EXPORT_FUNC(JsiCommandEncoder, finish),
                       JSI_EXPORT_FUNC(JsiCommandEncoder, beginComputePass),
                       JSI_EXPORT_FUNC(JsiCommandEncoder, copyBufferToBuffer))

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::CommandEncoder *fromValue(jsi::Runtime &runtime,
                                         const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiCommandEncoder>(runtime)->getObject().get();
    } else {
      throw jsi::JSError(runtime,
                         "Expected a JsiCommandEncoder object, but got a " +
                             raw.toString(runtime).utf8(runtime));
    }
  }
};
} // namespace RNSkia
