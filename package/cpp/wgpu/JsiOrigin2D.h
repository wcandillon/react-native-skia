#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiOrigin2D : public JsiSkWrappingSharedPtrHostObject<wgpu::Origin2D> {
public:
  JsiOrigin2D(std::shared_ptr<RNSkPlatformContext> context, wgpu::Origin2D m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Origin2D>(
            context, std::make_shared<wgpu::Origin2D>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiOrigin2D, Origin2D)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::Origin2D> fromValue(jsi::Runtime &runtime,
                                                   const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiOrigin2D>(runtime)->getObject();
  }
};
} // namespace RNSkia
