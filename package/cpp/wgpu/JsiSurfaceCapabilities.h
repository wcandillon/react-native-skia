#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSurfaceCapabilities
    : public JsiSkWrappingSharedPtrHostObject<wgpu::SurfaceCapabilities> {
public:
  JsiSurfaceCapabilities(std::shared_ptr<RNSkPlatformContext> context,
                         wgpu::SurfaceCapabilities m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::SurfaceCapabilities>(
            context,
            std::make_shared<wgpu::SurfaceCapabilities>(std::move(m))) {}

  JSI_HOST_FUNCTION(freeMembers) {

    auto ret = getObject()->freeMembers();
    return jsi::Value(ret);
  }

  EXPORT_JSI_API_TYPENAME(JsiSurfaceCapabilities, SurfaceCapabilities)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiSurfaceCapabilities, freeMembers))

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SurfaceCapabilities>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiSurfaceCapabilities>(runtime)->getObject();
  }
};
} // namespace RNSkia
