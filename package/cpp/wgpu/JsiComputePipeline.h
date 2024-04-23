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

class JsiComputePipeline
    : public JsiSkWrappingSharedPtrHostObject<wgpu::ComputePipeline> {
public:
  JsiComputePipeline(std::shared_ptr<RNSkPlatformContext> context,
                     wgpu::ComputePipeline m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::ComputePipeline>(
            context, std::make_shared<wgpu::ComputePipeline>(std::move(m))) {}

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

  EXPORT_JSI_API_TYPENAME(JsiComputePipeline, ComputePipeline)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiComputePipeline, getBindGroupLayout),
                       JSI_EXPORT_FUNC(JsiComputePipeline, setLabel))

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::ComputePipeline>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiComputePipeline>(runtime)->getObject();
  }
};
} // namespace RNSkia
