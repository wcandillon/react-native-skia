#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiBindGroupLayout.h"

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
    auto groupIndex = groupIndex.asNumber();
    auto ret = getObject()->getBindGroupLayout(*group index.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiBindGroupLayout>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(setLabel) {
    auto label = JsiChar::fromValue(runtime, arguments[0]);
    auto ret = getObject()->setLabel(*label.get());
    return jsi::Value(ret);
  }

  EXPORT_JSI_API_TYPENAME(JsiRenderPipeline, RenderPipeline)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiRenderPipeline, getBindGroupLayout),
                       JSI_EXPORT_FUNC(JsiRenderPipeline, setLabel))

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::RenderPipeline>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiRenderPipeline>(runtime)->getObject();
  }
};
} // namespace RNSkia
