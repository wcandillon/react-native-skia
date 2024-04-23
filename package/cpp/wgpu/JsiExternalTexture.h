#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiExternalTexture
    : public JsiSkWrappingSharedPtrHostObject<wgpu::ExternalTexture> {
public:
  JsiExternalTexture(std::shared_ptr<RNSkPlatformContext> context,
                     wgpu::ExternalTexture m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::ExternalTexture>(
            context, std::make_shared<wgpu::ExternalTexture>(std::move(m))) {}

  JSI_HOST_FUNCTION(setLabel) {
    auto label = JsiChar::fromValue(runtime, arguments[0]);
    auto ret = getObject()->setLabel(*label.get());
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(destroy) {

    auto ret = getObject()->destroy();
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(expire) {

    auto ret = getObject()->expire();
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(refresh) {

    auto ret = getObject()->refresh();
    return jsi::Value(ret);
  }

  EXPORT_JSI_API_TYPENAME(JsiExternalTexture, ExternalTexture)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiExternalTexture, setLabel),
                       JSI_EXPORT_FUNC(JsiExternalTexture, destroy),
                       JSI_EXPORT_FUNC(JsiExternalTexture, expire),
                       JSI_EXPORT_FUNC(JsiExternalTexture, refresh))

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::ExternalTexture>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiExternalTexture>(runtime)->getObject();
  }
};
} // namespace RNSkia
