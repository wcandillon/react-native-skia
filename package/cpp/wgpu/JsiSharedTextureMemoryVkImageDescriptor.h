#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiExtent3D.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSharedTextureMemoryVkImageDescriptor
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SharedTextureMemoryVkImageDescriptor> {
public:
  JsiSharedTextureMemoryVkImageDescriptor(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::SharedTextureMemoryVkImageDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::SharedTextureMemoryVkImageDescriptor>(
            context,
            std::make_shared<wgpu::SharedTextureMemoryVkImageDescriptor>(
                std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSharedTextureMemoryVkImageDescriptor,
                          SharedTextureMemoryVkImageDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SharedTextureMemoryVkImageDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object
        .asHostObject<JsiSharedTextureMemoryVkImageDescriptor>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
