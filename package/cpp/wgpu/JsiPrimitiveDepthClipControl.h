#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiPrimitiveDepthClipControl
    : public JsiSkWrappingSharedPtrHostObject<wgpu::PrimitiveDepthClipControl> {
public:
  JsiPrimitiveDepthClipControl(std::shared_ptr<RNSkPlatformContext> context,
                               wgpu::PrimitiveDepthClipControl m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::PrimitiveDepthClipControl>(
            context,
            std::make_shared<wgpu::PrimitiveDepthClipControl>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiPrimitiveDepthClipControl,
                          PrimitiveDepthClipControl)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::PrimitiveDepthClipControl>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiPrimitiveDepthClipControl>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
