#pragma once
#include <memory>
#include <string>
#include <utility>

#include "dawn/webgpu_cpp.h"

#include <jsi/jsi.h>

#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "JsiTextureView.h"
#include "MutableJSIBuffer.h"
#include "RNSkLog.h"
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

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiRequestAdapterOptions, RequestAdapterOptions)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::RequestAdapterOptions *fromValue(jsi::Runtime &runtime,
                                                const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiRequestAdapterOptions>(runtime)
          ->getObject()
          .get();
    } else {
      auto object = new wgpu::RequestAdapterOptions();

      if (obj.hasProperty(runtime, "powerPreference")) {
        auto powerPreference = obj.getProperty(runtime, "powerPreference");

        object->powerPreference = getPowerPreference(
            powerPreference.getString(runtime).utf8(runtime).c_str());
      }
      if (obj.hasProperty(runtime, "forceFallbackAdapter")) {
        auto forceFallbackAdapter =
            obj.getProperty(runtime, "forceFallbackAdapter");

        object->forceFallbackAdapter =
            static_cast<uint32_t>(forceFallbackAdapter.getBool());
      }
      return object;
    }
  }
};
} // namespace RNSkia
