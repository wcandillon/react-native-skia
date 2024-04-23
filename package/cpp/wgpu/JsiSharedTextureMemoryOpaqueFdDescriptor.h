#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSharedTextureMemoryOpaqueFdDescriptor
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SharedTextureMemoryOpaqueFdDescriptor> {
public:
  JsiSharedTextureMemoryOpaqueFdDescriptor(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::SharedTextureMemoryOpaqueFdDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::SharedTextureMemoryOpaqueFdDescriptor>(
            context,
            std::make_shared<wgpu::SharedTextureMemoryOpaqueFdDescriptor>(
                std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSharedTextureMemoryOpaqueFdDescriptor,
                          SharedTextureMemoryOpaqueFdDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SharedTextureMemoryOpaqueFdDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object
        .asHostObject<JsiSharedTextureMemoryOpaqueFdDescriptor>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
