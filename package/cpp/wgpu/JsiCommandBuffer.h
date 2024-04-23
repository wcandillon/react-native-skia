#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiCommandBuffer
    : public JsiSkWrappingSharedPtrHostObject<wgpu::CommandBuffer> {
public:
  JsiCommandBuffer(std::shared_ptr<RNSkPlatformContext> context,
                   wgpu::CommandBuffer m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::CommandBuffer>(
            context, std::make_shared<wgpu::CommandBuffer>(std::move(m))) {}

  JSI_HOST_FUNCTION(setLabel) {
    auto label = JsiChar::fromValue(runtime, arguments[0]);
    auto ret = getObject()->setLabel(*label.get());
    return jsi::Value(ret);
  }

  EXPORT_JSI_API_TYPENAME(JsiCommandBuffer, CommandBuffer)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiCommandBuffer, setLabel))

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::CommandBuffer> fromValue(jsi::Runtime &runtime,
                                                        const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiCommandBuffer>(runtime)->getObject();
  }
};
} // namespace RNSkia
