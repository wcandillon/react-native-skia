#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiTextureBindingViewDimensionDescriptor
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::TextureBindingViewDimensionDescriptor> {
public:
  JsiTextureBindingViewDimensionDescriptor(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::TextureBindingViewDimensionDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::TextureBindingViewDimensionDescriptor>(
            context,
            std::make_shared<wgpu::TextureBindingViewDimensionDescriptor>(
                std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiTextureBindingViewDimensionDescriptor,
                          TextureBindingViewDimensionDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::TextureBindingViewDimensionDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object
        .asHostObject<JsiTextureBindingViewDimensionDescriptor>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
