#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSurfaceDescriptorFromMetalLayer
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SurfaceDescriptorFromMetalLayer> {
public:
  JsiSurfaceDescriptorFromMetalLayer(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::SurfaceDescriptorFromMetalLayer m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::SurfaceDescriptorFromMetalLayer>(
            context, std::make_shared<wgpu::SurfaceDescriptorFromMetalLayer>(
                         std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSurfaceDescriptorFromMetalLayer,
                          SurfaceDescriptorFromMetalLayer)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SurfaceDescriptorFromMetalLayer>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiSurfaceDescriptorFromMetalLayer>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
