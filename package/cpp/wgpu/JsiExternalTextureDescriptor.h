#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiExtent2D.h"
#include "JsiOrigin2D.h"
#include "JsiTextureView.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiExternalTextureDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::ExternalTextureDescriptor> {
public:
  JsiExternalTextureDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                               wgpu::ExternalTextureDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::ExternalTextureDescriptor>(
            context,
            std::make_shared<wgpu::ExternalTextureDescriptor>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiExternalTextureDescriptor,
                          ExternalTextureDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::ExternalTextureDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiExternalTextureDescriptor>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
