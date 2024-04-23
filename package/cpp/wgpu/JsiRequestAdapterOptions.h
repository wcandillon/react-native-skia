#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiRequestAdapterOptions
    : public JsiSkWrappingSharedPtrHostObject<wgpu::RequestAdapterOptions> {
public:
  JsiRequestAdapterOptions(std::shared_ptr<RNSkPlatformContext> context,
                           wgpu::RequestAdapterOptions m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::RequestAdapterOptions>(
            context,
            std::make_shared<wgpu::RequestAdapterOptions>(std::move(m))) {}

  EXPORT_JSI_API_BRANDNAME(JsiRequestAdapterOptions, RequestAdapterOptions)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::RequestAdapterOptions>
  fromValue(jsi::Runtime &runtime, const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiRequestAdapterOptions>(runtime)->getObject();
    } else {
      wgpu::RequestAdapterOptions object;
      if (obj.hasProperty(runtime, "powerPreference")) {
        auto powerPreference = obj.getProperty(runtime, "powerPreference");
        object.powerPreference =
            JsiGpuPowerPreference::fromValue(runtime, powerPreference);
      }
      if (obj.hasProperty(runtime, "forceFallbackAdapter")) {
        auto forceFallbackAdapter =
            obj.getProperty(runtime, "forceFallbackAdapter");
        object.forceFallbackAdapter = forceFallbackAdapter.getBool();
      }
    }
  }
};
} // namespace RNSkia
