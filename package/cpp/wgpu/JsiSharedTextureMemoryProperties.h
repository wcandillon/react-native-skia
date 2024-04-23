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

class JsiSharedTextureMemoryProperties
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SharedTextureMemoryProperties> {
public:
  JsiSharedTextureMemoryProperties(std::shared_ptr<RNSkPlatformContext> context,
                                   wgpu::SharedTextureMemoryProperties m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::SharedTextureMemoryProperties>(
            context, std::make_shared<wgpu::SharedTextureMemoryProperties>(
                         std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSharedTextureMemoryProperties,
                          SharedTextureMemoryProperties)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SharedTextureMemoryProperties>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiSharedTextureMemoryProperties>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
