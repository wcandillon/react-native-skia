#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiColor : public JsiSkWrappingSharedPtrHostObject<wgpu::Color> {
public:
  JsiColor(std::shared_ptr<RNSkPlatformContext> context, wgpu::Color m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Color>(
            context, std::make_shared<wgpu::Color>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiColor, Color)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::Color> fromValue(jsi::Runtime &runtime,
                                                const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiColor>(runtime)->getObject();
  }
};
} // namespace RNSkia
