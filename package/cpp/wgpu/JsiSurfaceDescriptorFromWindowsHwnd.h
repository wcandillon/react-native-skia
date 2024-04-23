#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSurfaceDescriptorFromWindowsHwnd
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SurfaceDescriptorFromWindowsHwnd> {
public:
  JsiSurfaceDescriptorFromWindowsHwnd(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::SurfaceDescriptorFromWindowsHwnd m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::SurfaceDescriptorFromWindowsHwnd>(
            context, std::make_shared<wgpu::SurfaceDescriptorFromWindowsHwnd>(
                         std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSurfaceDescriptorFromWindowsHwnd,
                          SurfaceDescriptorFromWindowsHwnd)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SurfaceDescriptorFromWindowsHwnd>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiSurfaceDescriptorFromWindowsHwnd>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
