#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiRenderBundleEncoderDescriptor
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::RenderBundleEncoderDescriptor> {
public:
  JsiRenderBundleEncoderDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                                   wgpu::RenderBundleEncoderDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::RenderBundleEncoderDescriptor>(
            context, std::make_shared<wgpu::RenderBundleEncoderDescriptor>(
                         std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiRenderBundleEncoderDescriptor,
                          RenderBundleEncoderDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::RenderBundleEncoderDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiRenderBundleEncoderDescriptor>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
