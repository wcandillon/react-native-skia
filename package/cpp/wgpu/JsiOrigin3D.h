#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiOrigin3D : public JsiSkWrappingSharedPtrHostObject<wgpu::Origin3D> {
public:
  JsiOrigin3D(std::shared_ptr<RNSkPlatformContext> context, wgpu::Origin3D m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Origin3D>(
            context, std::make_shared<wgpu::Origin3D>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiOrigin3D, Origin3D)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::Origin3D> fromValue(jsi::Runtime &runtime,
                                                   const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiOrigin3D>(runtime)->getObject();
  }
};
} // namespace RNSkia
