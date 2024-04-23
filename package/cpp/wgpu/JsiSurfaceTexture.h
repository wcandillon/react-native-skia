#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiTexture.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSurfaceTexture
    : public JsiSkWrappingSharedPtrHostObject<wgpu::SurfaceTexture> {
public:
  JsiSurfaceTexture(std::shared_ptr<RNSkPlatformContext> context,
                    wgpu::SurfaceTexture m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::SurfaceTexture>(
            context, std::make_shared<wgpu::SurfaceTexture>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSurfaceTexture, SurfaceTexture)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SurfaceTexture>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiSurfaceTexture>(runtime)->getObject();
  }
};
} // namespace RNSkia
