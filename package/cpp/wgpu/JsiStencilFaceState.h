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

  EXPORT_JSI_API_TYPENAME(JsiStencilFaceState, StencilFaceState)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::StencilFaceState>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiStencilFaceState>(runtime)->getObject();
  }
};
} // namespace RNSkia
