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

class JsiSharedTextureMemoryBeginAccessDescriptor
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SharedTextureMemoryBeginAccessDescriptor> {
public:
  JsiSharedTextureMemoryBeginAccessDescriptor(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::SharedTextureMemoryBeginAccessDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::SharedTextureMemoryBeginAccessDescriptor>(
            context,
            std::make_shared<wgpu::SharedTextureMemoryBeginAccessDescriptor>(
                std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSharedTextureMemoryBeginAccessDescriptor,
                          SharedTextureMemoryBeginAccessDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SharedTextureMemoryBeginAccessDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object
        .asHostObject<JsiSharedTextureMemoryBeginAccessDescriptor>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
