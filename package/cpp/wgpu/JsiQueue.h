#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiBuffer.h"
#include "JsiCommandBuffer.h"
#include "JsiCopyTextureForBrowserOptions.h"
#include "JsiExtent3D.h"
#include "JsiFuture.h"
#include "JsiImageCopyExternalTexture.h"
#include "JsiImageCopyTexture.h"
#include "JsiQueueWorkDoneCallbackInfo.h"
#include "JsiTextureDataLayout.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiQueue : public JsiSkWrappingSharedPtrHostObject<wgpu::Queue> {
public:
  JsiQueue(std::shared_ptr<RNSkPlatformContext> context, wgpu::Queue m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Queue>(
            context, std::make_shared<wgpu::Queue>(std::move(m))) {}

  JSI_HOST_FUNCTION(submit) {
    auto commandCount = JsiSizeT::fromValue(runtime, arguments[0]);
    auto commands = JsiCommandBuffer::fromValue(runtime, arguments[1]);
    getObject()->submit(*command count.get(), *commands.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(onSubmittedWorkDone) {
    auto signalValue = JsiUint64T::fromValue(runtime, arguments[0]);
    auto callback = JsiQueueWorkDoneCallback::fromValue(runtime, arguments[1]);
    auto userdata = JsiVoid::fromValue(runtime, arguments[2]);
    getObject()->onSubmittedWorkDone(*signal value.get(), *callback.get(),
                                     *userdata.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(onSubmittedWorkDone) {
    auto callback = JsiQueueWorkDoneCallback::fromValue(runtime, arguments[0]);
    auto userdata = JsiVoid::fromValue(runtime, arguments[1]);
    getObject()->onSubmittedWorkDone(*callback.get(), *userdata.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(onSubmittedWorkDoneF) {
    auto callbackInfo =
        JsiQueueWorkDoneCallbackInfo::fromValue(runtime, arguments[0]);
    auto ret = getObject()->onSubmittedWorkDoneF(*callback info.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiFuture>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(writeBuffer) {
    auto buffer = JsiBuffer::fromValue(runtime, arguments[0]);
    auto bufferOffset = JsiUint64T::fromValue(runtime, arguments[1]);
    auto data = JsiVoid::fromValue(runtime, arguments[2]);
    auto size = JsiSizeT::fromValue(runtime, arguments[3]);
    getObject()->writeBuffer(*buffer.get(), *buffer offset.get(), *data.get(),
                             *size.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(writeTexture) {
    auto destination = JsiImageCopyTexture::fromValue(runtime, arguments[0]);
    auto data = JsiVoid::fromValue(runtime, arguments[1]);
    auto dataSize = JsiSizeT::fromValue(runtime, arguments[2]);
    auto dataLayout = JsiTextureDataLayout::fromValue(runtime, arguments[3]);
    auto writeSize = JsiExtent3D::fromValue(runtime, arguments[4]);
    getObject()->writeTexture(*destination.get(), *data.get(), *data size.get(),
                              *data layout.get(), *write size.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(copyTextureForBrowser) {
    auto source = JsiImageCopyTexture::fromValue(runtime, arguments[0]);
    auto destination = JsiImageCopyTexture::fromValue(runtime, arguments[1]);
    auto copySize = JsiExtent3D::fromValue(runtime, arguments[2]);
    auto options =
        JsiCopyTextureForBrowserOptions::fromValue(runtime, arguments[3]);
    getObject()->copyTextureForBrowser(*source.get(), *destination.get(),
                                       *copy size.get(), *options.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(copyExternalTextureForBrowser) {
    auto source = JsiImageCopyExternalTexture::fromValue(runtime, arguments[0]);
    auto destination = JsiImageCopyTexture::fromValue(runtime, arguments[1]);
    auto copySize = JsiExtent3D::fromValue(runtime, arguments[2]);
    auto options =
        JsiCopyTextureForBrowserOptions::fromValue(runtime, arguments[3]);
    getObject()->copyExternalTextureForBrowser(
        *source.get(), *destination.get(), *copy size.get(), *options.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(setLabel) {
    auto label = JsiChar::fromValue(runtime, arguments[0]);
    auto ret = getObject()->setLabel(*label.get());
    return jsi::Value(ret);
  }

  EXPORT_JSI_API_TYPENAME(JsiQueue, Queue)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiQueue, submit),
                       JSI_EXPORT_FUNC(JsiQueue, onSubmittedWorkDone),
                       JSI_EXPORT_FUNC(JsiQueue, onSubmittedWorkDone),
                       JSI_EXPORT_FUNC(JsiQueue, onSubmittedWorkDoneF),
                       JSI_EXPORT_FUNC(JsiQueue, writeBuffer),
                       JSI_EXPORT_FUNC(JsiQueue, writeTexture),
                       JSI_EXPORT_FUNC(JsiQueue, copyTextureForBrowser),
                       JSI_EXPORT_FUNC(JsiQueue, copyExternalTextureForBrowser),
                       JSI_EXPORT_FUNC(JsiQueue, setLabel))

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::Queue> fromValue(jsi::Runtime &runtime,
                                                const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiQueue>(runtime)->getObject();
  }
};
} // namespace RNSkia
