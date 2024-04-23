#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiBindGroup : public JsiSkWrappingSharedPtrHostObject<wgpu::BindGroup> {
public:
  JsiBindGroup(std::shared_ptr<RNSkPlatformContext> context, wgpu::BindGroup m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::BindGroup>(
            context, std::make_shared<wgpu::BindGroup>(std::move(m))) {}

  JSI_HOST_FUNCTION(setLabel) {
    auto label = JsiChar::fromValue(runtime, arguments[0]);
    auto ret = getObject()->setLabel(*label.get());
    return jsi::Value(ret);
  }

  EXPORT_JSI_API_TYPENAME(JsiBindGroup, BindGroup)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiBindGroup, setLabel))

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::BindGroup> fromValue(jsi::Runtime &runtime,
                                                    const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiBindGroup>(runtime)->getObject();
  }
};
} // namespace RNSkia
