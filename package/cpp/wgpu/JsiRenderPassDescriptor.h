#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiQuerySet.h"
#include "JsiRenderPassColorAttachment.h"
#include "JsiRenderPassDepthStencilAttachment.h"
#include "JsiRenderPassTimestampWrites.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiRenderPassDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::RenderPassDescriptor> {
public:
  JsiRenderPassDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                          wgpu::RenderPassDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::RenderPassDescriptor>(
            context,
            std::make_shared<wgpu::RenderPassDescriptor>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiRenderPassDescriptor, RenderPassDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::RenderPassDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiRenderPassDescriptor>(runtime)->getObject();
  }
};
} // namespace RNSkia
