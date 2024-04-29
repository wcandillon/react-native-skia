#pragma once
#include <memory>
#include <string>
#include <utility>

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiCommandBuffer.h"
#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiRenderPassDescriptor.h"
#include "JsiRenderPassEncoder.h"
#include "JsiSkHostObjects.h"
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

    auto ret = getObject()->beginRenderPass(*descriptor);
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiRenderPassEncoder>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(finish) {

    auto ret = getObject()->finish();
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiCommandBuffer>(getContext(), ret));
  }

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiCommandEncoder, CommandEncoder)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiCommandEncoder, beginRenderPass),
                       JSI_EXPORT_FUNC(JsiCommandEncoder, finish))

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
