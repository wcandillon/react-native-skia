#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiTextureBindingLayout
    : public JsiSkWrappingSharedPtrHostObject<wgpu::TextureBindingLayout> {
public:
  JsiTextureBindingLayout(std::shared_ptr<RNSkPlatformContext> context,
                          wgpu::TextureBindingLayout m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::TextureBindingLayout>(
            context,
            std::make_shared<wgpu::TextureBindingLayout>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiTextureBindingLayout, TextureBindingLayout)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::TextureBindingLayout>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiTextureBindingLayout>(runtime)->getObject();
  }
};
} // namespace RNSkia
