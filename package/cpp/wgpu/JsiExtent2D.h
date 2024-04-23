#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiExtent2D : public JsiSkWrappingSharedPtrHostObject<wgpu::Extent2D> {
public:
  JsiExtent2D(std::shared_ptr<RNSkPlatformContext> context, wgpu::Extent2D m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Extent2D>(
            context, std::make_shared<wgpu::Extent2D>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiExtent2D, Extent2D)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::Extent2D> fromValue(jsi::Runtime &runtime,
                                                   const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiExtent2D>(runtime)->getObject();
  }
};
} // namespace RNSkia
