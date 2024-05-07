#pragma once
#include <memory>
#include <string>
#include <utility>

#include "dawn/webgpu_cpp.h"

#include <jsi/jsi.h>

#include "JsiBindGroup.h"
#include "JsiBuffer.h"
#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiRenderPipeline.h"
#include "JsiSkHostObjects.h"
#include "JsiTextureView.h"
#include "MutableJSIBuffer.h"
#include "RNSkLog.h"
#include "RNSkPlatformContext.h"

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

    getObject()->SetPipeline(*pipeline);

    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(draw) {
    auto vertexCount = static_cast<uint32_t>(arguments[0].getNumber());
    uint32_t defaultInstanceCount = 1;
    auto instanceCount = count > 1
                             ? static_cast<uint32_t>(arguments[1].getNumber())
                             : defaultInstanceCount;
    uint32_t defaultFirstVertex = 0;
    auto firstVertex = count > 2
                           ? static_cast<uint32_t>(arguments[2].getNumber())
                           : defaultFirstVertex;
    uint32_t defaultFirstInstance = 0;
    auto firstInstance = count > 3
                             ? static_cast<uint32_t>(arguments[3].getNumber())
                             : defaultFirstInstance;

    getObject()->Draw(vertexCount, instanceCount, firstVertex, firstInstance);

    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(end) {

    getObject()->End();

    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(pushDebugGroup) {
    auto label = strdup(arguments[0].asString(runtime).utf8(runtime).c_str());

    getObject()->PushDebugGroup(label);

    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(popDebugGroup) {

    getObject()->PopDebugGroup();

    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(setBindGroup) {
    auto index = static_cast<uint32_t>(arguments[0].getNumber());
    auto bindGroup = JsiBindGroup::fromValue(runtime, arguments[1]);
    // auto dynamicOffsetCount = static_cast<size_t>(arguments[2].getNumber());
    getObject()->SetBindGroup(index, *bindGroup, 0, nullptr);
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(setVertexBuffer) {
    auto slot = static_cast<uint32_t>(arguments[0].getNumber());
    auto buffer = JsiBuffer::fromValue(runtime, arguments[1]);
    auto offset =
        count > 2 ? static_cast<uint64_t>(arguments[2].getNumber()) : 0;
    auto size = count > 3 ? static_cast<uint64_t>(arguments[3].getNumber())
                          : buffer->GetSize();

    getObject()->SetVertexBuffer(slot, *buffer, offset, size);
    return jsi::Value::undefined();
  }

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiRenderPassEncoder, RenderPassEncoder)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiRenderPassEncoder, setPipeline),
                       JSI_EXPORT_FUNC(JsiRenderPassEncoder, draw),
                       JSI_EXPORT_FUNC(JsiRenderPassEncoder, end),
                       JSI_EXPORT_FUNC(JsiRenderPassEncoder, pushDebugGroup),
                       JSI_EXPORT_FUNC(JsiRenderPassEncoder, popDebugGroup),
                       JSI_EXPORT_FUNC(JsiRenderPassEncoder, setBindGroup),
                       JSI_EXPORT_FUNC(JsiRenderPassEncoder, setVertexBuffer))

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::RenderPassEncoder *fromValue(jsi::Runtime &runtime,
                                            const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiRenderPassEncoder>(runtime)->getObject().get();
    } else {
      throw jsi::JSError(runtime,
                         "Expected a JsiRenderPassEncoder object, but got a " +
                             raw.toString(runtime).utf8(runtime));
    }
  }
};
} // namespace RNSkia
