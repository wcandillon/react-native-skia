#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiExtent3D : public JsiSkWrappingSharedPtrHostObject<wgpu::Extent3D> {
public:
  JsiExtent3D(std::shared_ptr<RNSkPlatformContext> context, wgpu::Extent3D m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Extent3D>(
            context, std::make_shared<wgpu::Extent3D>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiExtent3D, Extent3D)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::Extent3D> fromValue(jsi::Runtime &runtime,
                                                   const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiExtent3D>(runtime)->getObject();
  }
};
} // namespace RNSkia
