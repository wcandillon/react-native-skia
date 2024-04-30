#pragma once
#include <memory>
#include <string>
#include <utility>

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiBindGroupLayout.h"
#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkLog.h"
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

  JSI_HOST_FUNCTION(getBindGroupLayout) {
    auto index = static_cast<uint32_t>(arguments[0].getNumber());

    auto ret = getObject()->getBindGroupLayout(index);
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiBindGroupLayout>(getContext(), ret));
  }

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiRenderPipeline, RenderPipeline)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiRenderPipeline, getBindGroupLayout))

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::RenderPipeline *fromValue(jsi::Runtime &runtime,
                                         const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiRenderPipeline>(runtime)->getObject().get();
    } else {
      throw jsi::JSError(runtime,
                         "Expected a JsiRenderPipeline object, but got a " +
                             raw.toString(runtime).utf8(runtime));
    }
  }
};
} // namespace RNSkia
