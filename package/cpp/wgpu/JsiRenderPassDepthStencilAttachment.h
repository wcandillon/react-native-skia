#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiTextureView.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiRenderPassDepthStencilAttachment
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::RenderPassDepthStencilAttachment> {
public:
  JsiRenderPassDepthStencilAttachment(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::RenderPassDepthStencilAttachment m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::RenderPassDepthStencilAttachment>(
            context, std::make_shared<wgpu::RenderPassDepthStencilAttachment>(
                         std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiRenderPassDepthStencilAttachment,
                          RenderPassDepthStencilAttachment)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::RenderPassDepthStencilAttachment>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiRenderPassDepthStencilAttachment>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
