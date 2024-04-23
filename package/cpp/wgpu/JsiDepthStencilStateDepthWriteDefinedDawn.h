#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiDepthStencilStateDepthWriteDefinedDawn
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::DepthStencilStateDepthWriteDefinedDawn> {
public:
  JsiDepthStencilStateDepthWriteDefinedDawn(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::DepthStencilStateDepthWriteDefinedDawn m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::DepthStencilStateDepthWriteDefinedDawn>(
            context,
            std::make_shared<wgpu::DepthStencilStateDepthWriteDefinedDawn>(
                std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiDepthStencilStateDepthWriteDefinedDawn,
                          DepthStencilStateDepthWriteDefinedDawn)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::DepthStencilStateDepthWriteDefinedDawn>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object
        .asHostObject<JsiDepthStencilStateDepthWriteDefinedDawn>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
