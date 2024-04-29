#pragma once
#include <memory>
#include <string>
#include <utility>

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkLog.h"
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

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiCommandBuffer, CommandBuffer)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::CommandBuffer *fromValue(jsi::Runtime &runtime,
                                        const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiCommandBuffer>(runtime)->getObject().get();
    } else {
      throw jsi::JSError(runtime,
                         "Expected a JsiCommandBuffer object, but got a " +
                             raw.toString(runtime).utf8(runtime));
    }
  }
};
} // namespace RNSkia
