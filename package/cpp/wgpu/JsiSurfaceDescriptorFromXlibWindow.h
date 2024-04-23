#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSurfaceDescriptorFromXlibWindow
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SurfaceDescriptorFromXlibWindow> {
public:
  JsiSurfaceDescriptorFromXlibWindow(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::SurfaceDescriptorFromXlibWindow m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::SurfaceDescriptorFromXlibWindow>(
            context, std::make_shared<wgpu::SurfaceDescriptorFromXlibWindow>(
                         std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSurfaceDescriptorFromXlibWindow,
                          SurfaceDescriptorFromXlibWindow)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SurfaceDescriptorFromXlibWindow>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiSurfaceDescriptorFromXlibWindow>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
