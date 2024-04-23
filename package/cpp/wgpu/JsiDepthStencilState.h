#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiStencilFaceState.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiDepthStencilState
    : public JsiSkWrappingSharedPtrHostObject<wgpu::DepthStencilState> {
public:
  JsiDepthStencilState(std::shared_ptr<RNSkPlatformContext> context,
                       wgpu::DepthStencilState m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::DepthStencilState>(
            context, std::make_shared<wgpu::DepthStencilState>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiDepthStencilState, DepthStencilState)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::DepthStencilState>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiDepthStencilState>(runtime)->getObject();
  }
};
} // namespace RNSkia
