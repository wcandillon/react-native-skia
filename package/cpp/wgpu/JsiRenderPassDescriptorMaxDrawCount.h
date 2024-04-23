#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiRenderPassDescriptorMaxDrawCount
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::RenderPassDescriptorMaxDrawCount> {
public:
  JsiRenderPassDescriptorMaxDrawCount(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::RenderPassDescriptorMaxDrawCount m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::RenderPassDescriptorMaxDrawCount>(
            context, std::make_shared<wgpu::RenderPassDescriptorMaxDrawCount>(
                         std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiRenderPassDescriptorMaxDrawCount,
                          RenderPassDescriptorMaxDrawCount)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::RenderPassDescriptorMaxDrawCount>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiRenderPassDescriptorMaxDrawCount>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
