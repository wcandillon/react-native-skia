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

class JsiTextureDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::TextureDescriptor> {
public:
  JsiTextureDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                       wgpu::TextureDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::TextureDescriptor>(
            context, std::make_shared<wgpu::TextureDescriptor>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiTextureDescriptor, TextureDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::TextureDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiTextureDescriptor>(runtime)->getObject();
  }
};
} // namespace RNSkia
