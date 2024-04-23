#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiRenderPipeline
    : public JsiSkWrappingSharedPtrHostObject<wgpu::RenderPipeline> {
public:
  JsiRenderPipeline(std::shared_ptr<RNSkPlatformContext> context,
                    wgpu::RenderPipeline m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::RenderPipeline>(
            context, std::make_shared<wgpu::RenderPipeline>(std::move(m))) {}

  EXPORT_JSI_API_BRANDNAME(JsiRenderPipeline, RenderPipeline)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::RenderPipeline>
  fromValue(jsi::Runtime &runtime, const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiRenderPipeline>(runtime)->getObject();
    } else {
      throw jsi::JSError(runtime,
                         "Expected a JsiRenderPipeline object, but got a " +
                             raw.toString(runtime).utf8(runtime));
    }
  }
};
} // namespace RNSkia
