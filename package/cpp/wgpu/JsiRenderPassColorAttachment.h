#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiColor.h"
#include "JsiTextureView.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiRenderPassColorAttachment
    : public JsiSkWrappingSharedPtrHostObject<wgpu::RenderPassColorAttachment> {
public:
  JsiRenderPassColorAttachment(std::shared_ptr<RNSkPlatformContext> context,
                               wgpu::RenderPassColorAttachment m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::RenderPassColorAttachment>(
            context,
            std::make_shared<wgpu::RenderPassColorAttachment>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiRenderPassColorAttachment,
                          RenderPassColorAttachment)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::RenderPassColorAttachment>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiRenderPassColorAttachment>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
