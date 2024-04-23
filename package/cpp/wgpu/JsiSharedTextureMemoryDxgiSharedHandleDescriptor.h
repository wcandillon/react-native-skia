#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSharedTextureMemoryDxgiSharedHandleDescriptor
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SharedTextureMemoryDxgiSharedHandleDescriptor> {
public:
  JsiSharedTextureMemoryDxgiSharedHandleDescriptor(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::SharedTextureMemoryDxgiSharedHandleDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::SharedTextureMemoryDxgiSharedHandleDescriptor>(
            context, std::make_shared<
                         wgpu::SharedTextureMemoryDxgiSharedHandleDescriptor>(
                         std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSharedTextureMemoryDxgiSharedHandleDescriptor,
                          SharedTextureMemoryDxgiSharedHandleDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SharedTextureMemoryDxgiSharedHandleDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object
        .asHostObject<JsiSharedTextureMemoryDxgiSharedHandleDescriptor>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
