#pragma once
#include <memory>
#include <string>
#include <utility>

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiDevice.h"
#include "JsiDeviceDescriptor.h"
#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkLog.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiAdapter : public JsiSkWrappingSharedPtrHostObject<wgpu::Adapter> {
public:
  JsiAdapter(std::shared_ptr<RNSkPlatformContext> context, wgpu::Adapter m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Adapter>(
            context, std::make_shared<wgpu::Adapter>(std::move(m))) {}

  JSI_HOST_FUNCTION(requestDevice) {
    auto defaultDescriptor = new wgpu::DeviceDescriptor();
    auto descriptor =
        count > 0 ? JsiDeviceDescriptor::fromValue(runtime, arguments[0])
                  : defaultDescriptor;
    auto context = getContext();
    auto object = getObject();
    return RNJsi::JsiPromises::createPromiseAsJSIValue(
        runtime,
        [context = std::move(context), object = std::move(object),
         descriptor = std::move(descriptor)](
            jsi::Runtime &runtime,
            std::shared_ptr<RNJsi::JsiPromises::Promise> promise) -> void {
          auto ret = object->requestDevice(*descriptor);
          if (ret == nullptr) {
            promise->resolve(jsi::Value::null());
          } else {
            promise->resolve(jsi::Object::createFromHostObject(
                runtime, std::make_shared<JsiDevice>(std::move(context),
                                                     std::move(ret))));
          }
        });
  }

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiAdapter, Adapter)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiAdapter, requestDevice))

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::Adapter *fromValue(jsi::Runtime &runtime,
                                  const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiAdapter>(runtime)->getObject().get();
    } else {
      throw jsi::JSError(runtime, "Expected a JsiAdapter object, but got a " +
                                      raw.toString(runtime).utf8(runtime));
    }
  }
};
} // namespace RNSkia
