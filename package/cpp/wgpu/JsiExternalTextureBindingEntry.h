#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiExternalTexture.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiExternalTextureBindingEntry : public JsiSkWrappingSharedPtrHostObject<
                                           wgpu::ExternalTextureBindingEntry> {
public:
  JsiExternalTextureBindingEntry(std::shared_ptr<RNSkPlatformContext> context,
                                 wgpu::ExternalTextureBindingEntry m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::ExternalTextureBindingEntry>(
            context,
            std::make_shared<wgpu::ExternalTextureBindingEntry>(std::move(m))) {
  }

  EXPORT_JSI_API_TYPENAME(JsiExternalTextureBindingEntry,
                          ExternalTextureBindingEntry)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::ExternalTextureBindingEntry>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiExternalTextureBindingEntry>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
