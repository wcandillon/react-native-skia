#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSurfaceDescriptorFromWindowsSwapChainPanel
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SurfaceDescriptorFromWindowsSwapChainPanel> {
public:
  JsiSurfaceDescriptorFromWindowsSwapChainPanel(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::SurfaceDescriptorFromWindowsSwapChainPanel m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::SurfaceDescriptorFromWindowsSwapChainPanel>(
            context,
            std::make_shared<wgpu::SurfaceDescriptorFromWindowsSwapChainPanel>(
                std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSurfaceDescriptorFromWindowsSwapChainPanel,
                          SurfaceDescriptorFromWindowsSwapChainPanel)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SurfaceDescriptorFromWindowsSwapChainPanel>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object
        .asHostObject<JsiSurfaceDescriptorFromWindowsSwapChainPanel>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
