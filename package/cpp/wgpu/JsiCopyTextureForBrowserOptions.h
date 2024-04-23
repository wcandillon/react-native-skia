#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiCopyTextureForBrowserOptions
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::CopyTextureForBrowserOptions> {
public:
  JsiCopyTextureForBrowserOptions(std::shared_ptr<RNSkPlatformContext> context,
                                  wgpu::CopyTextureForBrowserOptions m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::CopyTextureForBrowserOptions>(
            context, std::make_shared<wgpu::CopyTextureForBrowserOptions>(
                         std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiCopyTextureForBrowserOptions,
                          CopyTextureForBrowserOptions)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::CopyTextureForBrowserOptions>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiCopyTextureForBrowserOptions>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
