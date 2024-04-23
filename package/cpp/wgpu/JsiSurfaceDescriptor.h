#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSurfaceDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::SurfaceDescriptor> {
public:
  JsiSurfaceDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                       wgpu::SurfaceDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::SurfaceDescriptor>(
            context, std::make_shared<wgpu::SurfaceDescriptor>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSurfaceDescriptor, SurfaceDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SurfaceDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiSurfaceDescriptor>(runtime)->getObject();
  }
};
} // namespace RNSkia
