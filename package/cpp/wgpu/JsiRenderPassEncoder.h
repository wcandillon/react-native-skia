#pragma once
#include <memory>
#include <string>
#include <utility>

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiRenderPipeline.h"
#include "JsiSkHostObjects.h"
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

    getObject()->setPipeline(*pipeline);
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

    getObject()->draw(vertexCount, instanceCount, firstVertex, firstInstance);
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(end) {

    getObject()->end();
    return jsi::Value::undefined();
  }

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiRenderPassEncoder, RenderPassEncoder)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiRenderPassEncoder, setPipeline),
                       JSI_EXPORT_FUNC(JsiRenderPassEncoder, draw),
                       JSI_EXPORT_FUNC(JsiRenderPassEncoder, end))

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
