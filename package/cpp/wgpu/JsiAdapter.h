#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiAdapter : public JsiSkWrappingSharedPtrHostObject<wgpu::Adapter> {
public:
  JsiAdapter(std::shared_ptr<RNSkPlatformContext> context, wgpu::Adapter m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Adapter>(
            context, std::make_shared<wgpu::Adapter>(std::move(m))) {}

  JSI_HOST_FUNCTION(getInstance) {

    auto ret = getObject()->getInstance();
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiInstance>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(getLimits) {
    auto limits = JsiSupportedLimits::fromValue(runtime, arguments[0]);
    auto ret = getObject()->getLimits(*limits.get());
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(getProperties) {
    auto properties = JsiAdapterProperties::fromValue(runtime, arguments[0]);
    getObject()->getProperties(*properties.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(hasFeature) {
    auto feature = JsiFeatureName::fromValue(runtime, arguments[0]);
    auto ret = getObject()->hasFeature(*feature.get());
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(enumerateFeatures) {
    auto features = JsiFeatureName::fromValue(runtime, arguments[0]);
    auto ret = getObject()->enumerateFeatures(*features.get());
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(requestDevice) {
    auto descriptor =
        count > 0 ? JsiDeviceDescriptor::fromValue(runtime, arguments[0])
                  : defaultDescriptor;
    auto callback = JsiRequestDeviceCallback::fromValue(runtime, arguments[1]);
    auto userdata = JsiVoid::fromValue(runtime, arguments[2]);
    getObject()->requestDevice(*descriptor.get(), *callback.get(),
                               *userdata.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(createDevice) {
    auto descriptor =
        count > 0 ? JsiDeviceDescriptor::fromValue(runtime, arguments[0])
                  : defaultDescriptor;
    auto ret = getObject()->createDevice(*descriptor.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiDevice>(getContext(), ret));
  }

  EXPORT_JSI_API_BRANDNAME(JsiAdapter, Adapter)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiAdapter, getInstance),
                       JSI_EXPORT_FUNC(JsiAdapter, getLimits),
                       JSI_EXPORT_FUNC(JsiAdapter, getProperties),
                       JSI_EXPORT_FUNC(JsiAdapter, hasFeature),
                       JSI_EXPORT_FUNC(JsiAdapter, enumerateFeatures),
                       JSI_EXPORT_FUNC(JsiAdapter, requestDevice),
                       JSI_EXPORT_FUNC(JsiAdapter, createDevice))

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::Adapter> fromValue(jsi::Runtime &runtime,
                                                  const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiAdapter>(runtime)->getObject();
  }
};
} // namespace RNSkia
