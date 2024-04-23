#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiRenderBundleDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::RenderBundleDescriptor> {
public:
  JsiRenderBundleDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                            wgpu::RenderBundleDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::RenderBundleDescriptor>(
            context,
            std::make_shared<wgpu::RenderBundleDescriptor>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiRenderBundleDescriptor, RenderBundleDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::RenderBundleDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiRenderBundleDescriptor>(runtime)->getObject();
  }
};
} // namespace RNSkia
