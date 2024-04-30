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

class JsiBindGroup : public JsiSkWrappingSharedPtrHostObject<wgpu::BindGroup> {
public:
  JsiBindGroup(std::shared_ptr<RNSkPlatformContext> context, wgpu::BindGroup m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::BindGroup>(
            context, std::make_shared<wgpu::BindGroup>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiBindGroup, BindGroup)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::BindGroup *fromValue(jsi::Runtime &runtime,
                                    const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiBindGroup>(runtime)->getObject().get();
    } else {
      throw jsi::JSError(runtime, "Expected a JsiBindGroup object, but got a " +
                                      raw.toString(runtime).utf8(runtime));
    }
  }
};
} // namespace RNSkia
