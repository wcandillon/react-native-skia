#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiConstantEntry.h"
#include "JsiShaderModule.h"
#include "JsiVertexBufferLayout.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiVertexState
    : public JsiSkWrappingSharedPtrHostObject<wgpu::VertexState> {
public:
  JsiVertexState(std::shared_ptr<RNSkPlatformContext> context,
                 wgpu::VertexState m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::VertexState>(
            context, std::make_shared<wgpu::VertexState>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiVertexState, VertexState)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::VertexState> fromValue(jsi::Runtime &runtime,
                                                      const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiVertexState>(runtime)->getObject();
  }
};
} // namespace RNSkia
