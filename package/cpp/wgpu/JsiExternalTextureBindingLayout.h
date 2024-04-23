#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiExternalTextureBindingLayout
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::ExternalTextureBindingLayout> {
public:
  JsiExternalTextureBindingLayout(std::shared_ptr<RNSkPlatformContext> context,
                                  wgpu::ExternalTextureBindingLayout m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::ExternalTextureBindingLayout>(
            context, std::make_shared<wgpu::ExternalTextureBindingLayout>(
                         std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiExternalTextureBindingLayout,
                          ExternalTextureBindingLayout)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::ExternalTextureBindingLayout>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiExternalTextureBindingLayout>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
