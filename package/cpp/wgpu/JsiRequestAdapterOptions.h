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
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    if (obj.isHostObject(runtime)) {
      return obj.asObject(runtime)
          .asHostObject<JsiRequestAdapterOptions>(runtime)
          ->getObject();
    } else {
      wgpu::RequestAdapterOptions object;
      const auto &o = obj.asObject(runtime);

      auto powerPreference = o.getProperty(runtime, "powerPreference");
      object.powerPreference = powerPreference;

      auto forceFallbackAdapter =
          o.getProperty(runtime, "forceFallbackAdapter");
      object.forceFallbackAdapter = forceFallbackAdapter;
    }
  }
};
} // namespace RNSkia
