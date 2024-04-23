#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiStencilFaceState
    : public JsiSkWrappingSharedPtrHostObject<wgpu::StencilFaceState> {
public:
  JsiStencilFaceState(std::shared_ptr<RNSkPlatformContext> context,
                      wgpu::StencilFaceState m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::StencilFaceState>(
            context, std::make_shared<wgpu::StencilFaceState>(std::move(m))) {}

  EXPORT_JSI_API_BRANDNAME(JsiStencilFaceState, StencilFaceState)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::StencilFaceState>
  fromValue(jsi::Runtime &runtime, const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiStencilFaceState>(runtime)->getObject();
    } else {
      throw jsi::JSError(runtime,
                         "Expected a JsiStencilFaceState object, but got a " +
                             raw.toString(runtime).utf8(runtime));
    }
  }
};
} // namespace RNSkia
