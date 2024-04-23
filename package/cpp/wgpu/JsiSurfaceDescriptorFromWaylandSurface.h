#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSurfaceDescriptorFromWaylandSurface
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SurfaceDescriptorFromWaylandSurface> {
public:
  JsiSurfaceDescriptorFromWaylandSurface(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::SurfaceDescriptorFromWaylandSurface m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::SurfaceDescriptorFromWaylandSurface>(
            context,
            std::make_shared<wgpu::SurfaceDescriptorFromWaylandSurface>(
                std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSurfaceDescriptorFromWaylandSurface,
                          SurfaceDescriptorFromWaylandSurface)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SurfaceDescriptorFromWaylandSurface>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiSurfaceDescriptorFromWaylandSurface>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
