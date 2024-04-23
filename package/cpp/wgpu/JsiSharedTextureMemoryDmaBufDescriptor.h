#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiExtent3D.h"
#include "JsiSharedTextureMemoryDmaBufPlane.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSharedTextureMemoryDmaBufDescriptor
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SharedTextureMemoryDmaBufDescriptor> {
public:
  JsiSharedTextureMemoryDmaBufDescriptor(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::SharedTextureMemoryDmaBufDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::SharedTextureMemoryDmaBufDescriptor>(
            context,
            std::make_shared<wgpu::SharedTextureMemoryDmaBufDescriptor>(
                std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSharedTextureMemoryDmaBufDescriptor,
                          SharedTextureMemoryDmaBufDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SharedTextureMemoryDmaBufDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiSharedTextureMemoryDmaBufDescriptor>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
