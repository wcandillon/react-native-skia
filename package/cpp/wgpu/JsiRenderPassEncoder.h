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

    getObject()->setPipeline(*pipeline.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(draw) {
    auto vertexCount = vertexCount.asNumber();
    uint32_t defaultInstanceCount = 1;
    auto instanceCount =
        count > 1 ? instanceCount.asNumber() : defaultInstanceCount;
    uint32_t defaultFirstVertex = 0;
    auto firstVertex = count > 2 ? firstVertex.asNumber() : defaultFirstVertex;
    uint32_t defaultFirstInstance = 0;
    auto firstInstance =
        count > 3 ? firstInstance.asNumber() : defaultFirstInstance;

    getObject()->draw(*vertexCount.get(), *instanceCount.get(),
                      *firstVertex.get(), *firstInstance.get());
    return jsi::Value::undefined();
  }

  EXPORT_JSI_API_BRANDNAME(JsiRenderPassEncoder, RenderPassEncoder)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiRenderPassEncoder, setPipeline),
                       JSI_EXPORT_FUNC(JsiRenderPassEncoder, draw))

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::RenderPassEncoder>
  fromValue(jsi::Runtime &runtime, const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiRenderPassEncoder>(runtime)->getObject();
    } else {
      throw jsi::JSError(runtime,
                         "Expected a JsiRenderPassEncoder object, but got a " +
                             raw.toString(runtime).utf8(runtime));
    }
  }
};
} // namespace RNSkia
