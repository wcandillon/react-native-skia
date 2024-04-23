#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSharedTextureMemoryVkImageLayoutBeginState
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SharedTextureMemoryVkImageLayoutBeginState> {
public:
  JsiSharedTextureMemoryVkImageLayoutBeginState(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::SharedTextureMemoryVkImageLayoutBeginState m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::SharedTextureMemoryVkImageLayoutBeginState>(
            context,
            std::make_shared<wgpu::SharedTextureMemoryVkImageLayoutBeginState>(
                std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSharedTextureMemoryVkImageLayoutBeginState,
                          SharedTextureMemoryVkImageLayoutBeginState)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SharedTextureMemoryVkImageLayoutBeginState>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object
        .asHostObject<JsiSharedTextureMemoryVkImageLayoutBeginState>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
