#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiDawnRenderPassColorAttachmentRenderToSingleSampled
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::DawnRenderPassColorAttachmentRenderToSingleSampled> {
public:
  JsiDawnRenderPassColorAttachmentRenderToSingleSampled(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::DawnRenderPassColorAttachmentRenderToSingleSampled m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::DawnRenderPassColorAttachmentRenderToSingleSampled>(
            context,
            std::make_shared<
                wgpu::DawnRenderPassColorAttachmentRenderToSingleSampled>(
                std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiDawnRenderPassColorAttachmentRenderToSingleSampled,
                          DawnRenderPassColorAttachmentRenderToSingleSampled)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<
      wgpu::DawnRenderPassColorAttachmentRenderToSingleSampled>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object
        .asHostObject<JsiDawnRenderPassColorAttachmentRenderToSingleSampled>(
            runtime)
        ->getObject();
  }
};
} // namespace RNSkia
