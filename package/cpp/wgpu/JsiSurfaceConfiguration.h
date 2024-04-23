#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiDevice.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSurfaceConfiguration
    : public JsiSkWrappingSharedPtrHostObject<wgpu::SurfaceConfiguration> {
public:
  JsiSurfaceConfiguration(std::shared_ptr<RNSkPlatformContext> context,
                          wgpu::SurfaceConfiguration m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::SurfaceConfiguration>(
            context,
            std::make_shared<wgpu::SurfaceConfiguration>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSurfaceConfiguration, SurfaceConfiguration)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SurfaceConfiguration>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiSurfaceConfiguration>(runtime)->getObject();
  }
};
} // namespace RNSkia
