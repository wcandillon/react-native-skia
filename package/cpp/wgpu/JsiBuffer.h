#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiBufferMapCallbackInfo.h"
#include "JsiFuture.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiBuffer : public JsiSkWrappingSharedPtrHostObject<wgpu::Buffer> {
public:
  JsiBuffer(std::shared_ptr<RNSkPlatformContext> context, wgpu::Buffer m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Buffer>(
            context, std::make_shared<wgpu::Buffer>(std::move(m))) {}

  JSI_HOST_FUNCTION(mapAsync) {
    auto mode = JsiMapMode::fromValue(runtime, arguments[0]);
    auto offset = JsiSizeT::fromValue(runtime, arguments[1]);
    auto size = JsiSizeT::fromValue(runtime, arguments[2]);
    auto callback = JsiBufferMapCallback::fromValue(runtime, arguments[3]);
    auto userdata = JsiVoid::fromValue(runtime, arguments[4]);
    getObject()->mapAsync(*mode.get(), *offset.get(), *size.get(),
                          *callback.get(), *userdata.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(mapAsyncF) {
    auto mode = JsiMapMode::fromValue(runtime, arguments[0]);
    auto offset = JsiSizeT::fromValue(runtime, arguments[1]);
    auto size = JsiSizeT::fromValue(runtime, arguments[2]);
    auto callbackInfo =
        JsiBufferMapCallbackInfo::fromValue(runtime, arguments[3]);
    auto ret = getObject()->mapAsyncF(*mode.get(), *offset.get(), *size.get(),
                                      *callback info.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiFuture>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(getMappedRange) {
    auto offset = JsiSizeT::fromValue(runtime, arguments[0]);
    auto size = JsiSizeT::fromValue(runtime, arguments[1]);
    auto ret = getObject()->getMappedRange(*offset.get(), *size.get());
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(getConstMappedRange) {
    auto offset = JsiSizeT::fromValue(runtime, arguments[0]);
    auto size = JsiSizeT::fromValue(runtime, arguments[1]);
    auto ret = getObject()->getConstMappedRange(*offset.get(), *size.get());
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(setLabel) {
    auto label = JsiChar::fromValue(runtime, arguments[0]);
    auto ret = getObject()->setLabel(*label.get());
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(getUsage) {

    auto ret = getObject()->getUsage();
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiBufferUsage>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(getSize) {

    auto ret = getObject()->getSize();
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(getMapState) {

    auto ret = getObject()->getMapState();
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiBufferMapState>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(unmap) {

    getObject()->unmap();
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(destroy) {

    getObject()->destroy();
    return jsi::Value::undefined();
  }

  EXPORT_JSI_API_TYPENAME(JsiBuffer, Buffer)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiBuffer, mapAsync),
                       JSI_EXPORT_FUNC(JsiBuffer, mapAsyncF),
                       JSI_EXPORT_FUNC(JsiBuffer, getMappedRange),
                       JSI_EXPORT_FUNC(JsiBuffer, getConstMappedRange),
                       JSI_EXPORT_FUNC(JsiBuffer, setLabel),
                       JSI_EXPORT_FUNC(JsiBuffer, getUsage),
                       JSI_EXPORT_FUNC(JsiBuffer, getSize),
                       JSI_EXPORT_FUNC(JsiBuffer, getMapState),
                       JSI_EXPORT_FUNC(JsiBuffer, unmap),
                       JSI_EXPORT_FUNC(JsiBuffer, destroy))

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::Buffer> fromValue(jsi::Runtime &runtime,
                                                 const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiBuffer>(runtime)->getObject();
  }
};
} // namespace RNSkia
