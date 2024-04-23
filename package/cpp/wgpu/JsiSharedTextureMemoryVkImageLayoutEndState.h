#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSharedTextureMemoryVkImageLayoutEndState
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SharedTextureMemoryVkImageLayoutEndState> {
public:
  JsiSharedTextureMemoryVkImageLayoutEndState(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::SharedTextureMemoryVkImageLayoutEndState m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::SharedTextureMemoryVkImageLayoutEndState>(
            context,
            std::make_shared<wgpu::SharedTextureMemoryVkImageLayoutEndState>(
                std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSharedTextureMemoryVkImageLayoutEndState,
                          SharedTextureMemoryVkImageLayoutEndState)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SharedTextureMemoryVkImageLayoutEndState>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object
        .asHostObject<JsiSharedTextureMemoryVkImageLayoutEndState>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
