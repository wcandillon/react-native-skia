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

  EXPORT_JSI_API_BRANDNAME(JsiRenderPassEncoder, RenderPassEncoder)

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
