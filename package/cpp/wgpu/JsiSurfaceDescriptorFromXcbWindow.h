#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSurfaceDescriptorFromXcbWindow
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SurfaceDescriptorFromXcbWindow> {
public:
  JsiSurfaceDescriptorFromXcbWindow(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::SurfaceDescriptorFromXcbWindow m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::SurfaceDescriptorFromXcbWindow>(
            context, std::make_shared<wgpu::SurfaceDescriptorFromXcbWindow>(
                         std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSurfaceDescriptorFromXcbWindow,
                          SurfaceDescriptorFromXcbWindow)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SurfaceDescriptorFromXcbWindow>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiSurfaceDescriptorFromXcbWindow>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
