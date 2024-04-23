#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSurfaceDescriptorFromWindowsCoreWindow
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SurfaceDescriptorFromWindowsCoreWindow> {
public:
  JsiSurfaceDescriptorFromWindowsCoreWindow(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::SurfaceDescriptorFromWindowsCoreWindow m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::SurfaceDescriptorFromWindowsCoreWindow>(
            context,
            std::make_shared<wgpu::SurfaceDescriptorFromWindowsCoreWindow>(
                std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSurfaceDescriptorFromWindowsCoreWindow,
                          SurfaceDescriptorFromWindowsCoreWindow)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SurfaceDescriptorFromWindowsCoreWindow>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object
        .asHostObject<JsiSurfaceDescriptorFromWindowsCoreWindow>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
