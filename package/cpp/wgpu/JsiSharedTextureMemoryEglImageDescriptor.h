#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSharedTextureMemoryEglImageDescriptor
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SharedTextureMemoryEglImageDescriptor> {
public:
  JsiSharedTextureMemoryEglImageDescriptor(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::SharedTextureMemoryEglImageDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::SharedTextureMemoryEglImageDescriptor>(
            context,
            std::make_shared<wgpu::SharedTextureMemoryEglImageDescriptor>(
                std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSharedTextureMemoryEglImageDescriptor,
                          SharedTextureMemoryEglImageDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SharedTextureMemoryEglImageDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object
        .asHostObject<JsiSharedTextureMemoryEglImageDescriptor>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
