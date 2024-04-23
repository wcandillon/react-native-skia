#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiAdapter.h"
#include "JsiSurfaceCapabilities.h"
#include "JsiSurfaceConfiguration.h"
#include "JsiSurfaceTexture.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSurface : public JsiSkWrappingSharedPtrHostObject<wgpu::Surface> {
public:
  JsiSurface(std::shared_ptr<RNSkPlatformContext> context, wgpu::Surface m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Surface>(
            context, std::make_shared<wgpu::Surface>(std::move(m))) {}

  JSI_HOST_FUNCTION(configure) {
    auto config = JsiSurfaceConfiguration::fromValue(runtime, arguments[0]);
    auto ret = getObject()->configure(*config.get());
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(getCapabilities) {
    auto adapter = JsiAdapter::fromValue(runtime, arguments[0]);
    auto capabilities =
        JsiSurfaceCapabilities::fromValue(runtime, arguments[1]);
    auto ret =
        getObject()->getCapabilities(*adapter.get(), *capabilities.get());
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(getCurrentTexture) {
    auto surfaceTexture = JsiSurfaceTexture::fromValue(runtime, arguments[0]);
    auto ret = getObject()->getCurrentTexture(*surface texture.get());
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(getPreferredFormat) {
    auto adapter = JsiAdapter::fromValue(runtime, arguments[0]);
    auto ret = getObject()->getPreferredFormat(*adapter.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiTextureFormat>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(present) {

    auto ret = getObject()->present();
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(unconfigure) {

    auto ret = getObject()->unconfigure();
    return jsi::Value(ret);
  }

  EXPORT_JSI_API_TYPENAME(JsiSurface, Surface)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiSurface, configure),
                       JSI_EXPORT_FUNC(JsiSurface, getCapabilities),
                       JSI_EXPORT_FUNC(JsiSurface, getCurrentTexture),
                       JSI_EXPORT_FUNC(JsiSurface, getPreferredFormat),
                       JSI_EXPORT_FUNC(JsiSurface, present),
                       JSI_EXPORT_FUNC(JsiSurface, unconfigure))

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::Surface> fromValue(jsi::Runtime &runtime,
                                                  const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiSurface>(runtime)->getObject();
  }
};
} // namespace RNSkia
