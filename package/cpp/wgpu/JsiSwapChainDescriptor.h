#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSwapChainDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::SwapChainDescriptor> {
public:
  JsiSwapChainDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                         wgpu::SwapChainDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::SwapChainDescriptor>(
            context,
            std::make_shared<wgpu::SwapChainDescriptor>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSwapChainDescriptor, SwapChainDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SwapChainDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiSwapChainDescriptor>(runtime)->getObject();
  }
};
} // namespace RNSkia
