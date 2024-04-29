#pragma once
#include <memory>
#include <string>
#include <utility>

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "JsiTextureView.h"
#include "RNSkLog.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiTexture : public JsiSkWrappingSharedPtrHostObject<wgpu::Texture> {
public:
  JsiTexture(std::shared_ptr<RNSkPlatformContext> context, wgpu::Texture m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Texture>(
            context, std::make_shared<wgpu::Texture>(std::move(m))) {}

  JSI_HOST_FUNCTION(createView) {

    auto ret = getObject()->createView();
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiTextureView>(getContext(), ret));
  }

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiTexture, Texture)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiTexture, createView))

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::Texture *fromValue(jsi::Runtime &runtime,
                                  const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiTexture>(runtime)->getObject().get();
    } else {
      throw jsi::JSError(runtime, "Expected a JsiTexture object, but got a " +
                                      raw.toString(runtime).utf8(runtime));
    }
  }
};
} // namespace RNSkia
