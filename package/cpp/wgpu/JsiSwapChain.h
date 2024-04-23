#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiTexture.h"
#include "JsiTextureView.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSwapChain : public JsiSkWrappingSharedPtrHostObject<wgpu::SwapChain> {
public:
  JsiSwapChain(std::shared_ptr<RNSkPlatformContext> context, wgpu::SwapChain m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::SwapChain>(
            context, std::make_shared<wgpu::SwapChain>(std::move(m))) {}

  JSI_HOST_FUNCTION(getCurrentTextureView) {

    auto ret = getObject()->getCurrentTextureView();
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiTextureView>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(getCurrentTexture) {

    auto ret = getObject()->getCurrentTexture();
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiTexture>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(present) {

    getObject()->present();
    return jsi::Value::undefined();
  }

  EXPORT_JSI_API_TYPENAME(JsiSwapChain, SwapChain)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiSwapChain, getCurrentTextureView),
                       JSI_EXPORT_FUNC(JsiSwapChain, getCurrentTexture),
                       JSI_EXPORT_FUNC(JsiSwapChain, present))

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SwapChain> fromValue(jsi::Runtime &runtime,
                                                    const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiSwapChain>(runtime)->getObject();
  }
};
} // namespace RNSkia
