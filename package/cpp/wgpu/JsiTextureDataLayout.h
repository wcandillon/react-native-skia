#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiTextureDataLayout
    : public JsiSkWrappingSharedPtrHostObject<wgpu::TextureDataLayout> {
public:
  JsiTextureDataLayout(std::shared_ptr<RNSkPlatformContext> context,
                       wgpu::TextureDataLayout m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::TextureDataLayout>(
            context, std::make_shared<wgpu::TextureDataLayout>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiTextureDataLayout, TextureDataLayout)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::TextureDataLayout>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiTextureDataLayout>(runtime)->getObject();
  }
};
} // namespace RNSkia
