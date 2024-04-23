#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSharedTextureMemoryDescriptor
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SharedTextureMemoryDescriptor> {
public:
  JsiSharedTextureMemoryDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                                   wgpu::SharedTextureMemoryDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::SharedTextureMemoryDescriptor>(
            context, std::make_shared<wgpu::SharedTextureMemoryDescriptor>(
                         std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSharedTextureMemoryDescriptor,
                          SharedTextureMemoryDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SharedTextureMemoryDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiSharedTextureMemoryDescriptor>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
