#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSurfaceDescriptorFromAndroidNativeWindow
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SurfaceDescriptorFromAndroidNativeWindow> {
public:
  JsiSurfaceDescriptorFromAndroidNativeWindow(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::SurfaceDescriptorFromAndroidNativeWindow m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::SurfaceDescriptorFromAndroidNativeWindow>(
            context,
            std::make_shared<wgpu::SurfaceDescriptorFromAndroidNativeWindow>(
                std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSurfaceDescriptorFromAndroidNativeWindow,
                          SurfaceDescriptorFromAndroidNativeWindow)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SurfaceDescriptorFromAndroidNativeWindow>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object
        .asHostObject<JsiSurfaceDescriptorFromAndroidNativeWindow>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
