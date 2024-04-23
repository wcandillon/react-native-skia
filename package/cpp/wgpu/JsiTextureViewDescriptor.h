#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiTextureViewDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::TextureViewDescriptor> {
public:
  JsiTextureViewDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                           wgpu::TextureViewDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::TextureViewDescriptor>(
            context,
            std::make_shared<wgpu::TextureViewDescriptor>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiTextureViewDescriptor, TextureViewDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::TextureViewDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiTextureViewDescriptor>(runtime)->getObject();
  }
};
} // namespace RNSkia
