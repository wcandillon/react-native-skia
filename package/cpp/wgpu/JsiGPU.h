#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiAdapter.h"
#include "JsiRequestAdapterOptions.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiGPU : public JsiSkWrappingSharedPtrHostObject<wgpu::Instance> {
public:
  JsiGPU(std::shared_ptr<RNSkPlatformContext> context, wgpu::Instance m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Instance>(
            context, std::make_shared<wgpu::Instance>(std::move(m))) {}

  JSI_HOST_FUNCTION(requestAdapter) {
    //auto options = JsiWGPUOptions::fromValue(runtime, arguments[0]);
    auto context = getContext();
    auto instance = getObject();
    return RNJsi::JsiPromises::createPromiseAsJSIValue(
        runtime,
        [context = std::move(context), instance](
            jsi::Runtime &runtime,
            std::shared_ptr<RNJsi::JsiPromises::Promise> promise) -> void {
          wgpu::RequestAdapterOptions adapterOpts;
          // adapterOpts.compatibleSurface = surface;
          auto ret = instance->requestAdapter(adapterOpts);
          promise->resolve(jsi::Object::createFromHostObject(
              runtime, std::make_shared<JsiAdapter>(std::move(context),
                                                    std::move(ret))));
        });
  }

  EXPORT_JSI_API_BRANDNAME(JsiGPU, GPU)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiGPU, requestAdapter))

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::Instance> fromValue(jsi::Runtime &runtime,
                                                   const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiGPU>(runtime)->getObject();
  }
};
} // namespace RNSkia
