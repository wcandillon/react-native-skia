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
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiQueue : public JsiSkWrappingSharedPtrHostObject<wgpu::Queue> {
public:
  JsiQueue(std::shared_ptr<RNSkPlatformContext> context, wgpu::Queue m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Queue>(
            context, std::make_shared<wgpu::Queue>(std::move(m))) {}

  JSI_HOST_FUNCTION(submit) {
    auto commandBuffer = JsiCommandBuffer::fromValue(runtime, arguments[0]);

    getObject()->submit(*commandBuffer.get());
    return jsi::Value::undefined();
  }

  EXPORT_JSI_API_BRANDNAME(JsiQueue, Queue)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiQueue, submit))

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::Queue> fromValue(jsi::Runtime &runtime,
                                                const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiQueue>(runtime)->getObject();
    } else {
      throw jsi::JSError(runtime, "Expected a JsiQueue object, but got a " +
                                      raw.toString(runtime).utf8(runtime));
    }
  }
};
} // namespace RNSkia
