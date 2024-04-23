#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiFuture.h"
#include "JsiFutureWaitInfo.h"
#include "JsiRequestAdapterCallbackInfo.h"
#include "JsiRequestAdapterOptions.h"
#include "JsiSurface.h"
#include "JsiSurfaceDescriptor.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiInstance : public JsiSkWrappingSharedPtrHostObject<wgpu::Instance> {
public:
  JsiInstance(std::shared_ptr<RNSkPlatformContext> context, wgpu::Instance m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Instance>(
            context, std::make_shared<wgpu::Instance>(std::move(m))) {}

  JSI_HOST_FUNCTION(createSurface) {
    auto descriptor = JsiSurfaceDescriptor::fromValue(runtime, arguments[0]);
    auto ret = getObject()->createSurface(*descriptor.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiSurface>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(processEvents) {

    getObject()->processEvents();
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(waitAny) {
    auto futureCount = JsiSizeT::fromValue(runtime, arguments[0]);
    auto futures = JsiFutureWaitInfo::fromValue(runtime, arguments[1]);
    auto timeoutNs = JsiUint64T::fromValue(runtime, arguments[2]);
    auto ret = getObject()->waitAny(*future count.get(), *futures.get(),
                                    *timeout NS.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiWaitStatus>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(requestAdapter) {
    auto options =
        count > 0 ? JsiRequestAdapterOptions::fromValue(runtime, arguments[0])
                  : defaultOptions;
    auto callback = JsiRequestAdapterCallback::fromValue(runtime, arguments[1]);
    auto userdata = JsiVoid::fromValue(runtime, arguments[2]);
    getObject()->requestAdapter(*options.get(), *callback.get(),
                                *userdata.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(requestAdapterF) {
    auto options =
        count > 0 ? JsiRequestAdapterOptions::fromValue(runtime, arguments[0])
                  : defaultOptions;
    auto callbackInfo =
        JsiRequestAdapterCallbackInfo::fromValue(runtime, arguments[1]);
    auto ret =
        getObject()->requestAdapterF(*options.get(), *callback info.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiFuture>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(hasWgslLanguageFeature) {
    auto feature = JsiWgslFeatureName::fromValue(runtime, arguments[0]);
    auto ret = getObject()->hasWgslLanguageFeature(*feature.get());
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(enumerateWgslLanguageFeatures) {
    auto features = JsiWgslFeatureName::fromValue(runtime, arguments[0]);
    auto ret = getObject()->enumerateWgslLanguageFeatures(*features.get());
    return jsi::Value(ret);
  }

  EXPORT_JSI_API_TYPENAME(JsiInstance, Instance)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiInstance, createSurface),
                       JSI_EXPORT_FUNC(JsiInstance, processEvents),
                       JSI_EXPORT_FUNC(JsiInstance, waitAny),
                       JSI_EXPORT_FUNC(JsiInstance, requestAdapter),
                       JSI_EXPORT_FUNC(JsiInstance, requestAdapterF),
                       JSI_EXPORT_FUNC(JsiInstance, hasWgslLanguageFeature),
                       JSI_EXPORT_FUNC(JsiInstance,
                                       enumerateWgslLanguageFeatures))

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::Instance> fromValue(jsi::Runtime &runtime,
                                                   const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiInstance>(runtime)->getObject();
  }
};
} // namespace RNSkia
