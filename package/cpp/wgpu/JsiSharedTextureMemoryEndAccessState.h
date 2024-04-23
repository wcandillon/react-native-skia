#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiSharedFence.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSharedTextureMemoryEndAccessState
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SharedTextureMemoryEndAccessState> {
public:
  JsiSharedTextureMemoryEndAccessState(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::SharedTextureMemoryEndAccessState m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::SharedTextureMemoryEndAccessState>(
            context, std::make_shared<wgpu::SharedTextureMemoryEndAccessState>(
                         std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSharedTextureMemoryEndAccessState,
                          SharedTextureMemoryEndAccessState)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SharedTextureMemoryEndAccessState>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiSharedTextureMemoryEndAccessState>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
