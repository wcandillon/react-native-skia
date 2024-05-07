#pragma once
#include <memory>
#include <string>
#include <utility>

#include "dawn/webgpu_cpp.h"

#include <jsi/jsi.h>

#include "JsiCommandBuffer.h"
#include "JsiEnums.h"
#include "JsiExtent3D.h"
#include "JsiHostObject.h"
#include "JsiImageCopyTexture.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "JsiTextureDataLayout.h"
#include "JsiTextureView.h"
#include "MutableJSIBuffer.h"
#include "RNSkLog.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiQueue : public JsiSkWrappingSharedPtrHostObject<wgpu::Queue> {
public:
  JsiQueue(std::shared_ptr<RNSkPlatformContext> context, wgpu::Queue m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Queue>(
            context, std::make_shared<wgpu::Queue>(std::move(m))) {}

  JSI_HOST_FUNCTION(submit) {
    std::vector<wgpu::CommandBuffer> commandBuffers;
    auto jsiArray = arguments[0].asObject(runtime).asArray(runtime);
    auto jsiArraySize = static_cast<int>(jsiArray.size(runtime));
    for (int i = 0; i < jsiArraySize; i++) {
      auto val = jsiArray.getValueAtIndex(runtime, i);
      commandBuffers.push_back(*JsiCommandBuffer::fromValue(runtime, val));
    }

    getObject()->Submit(commandBuffers.size(), commandBuffers.data());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(writeTexture) {
    auto destination = JsiImageCopyTexture::fromValue(runtime, arguments[0]);
    if (!arguments[1].isObject()) {
      throw jsi::JSError(runtime, "writeTexture: data must be an ArrayBuffer");
    }
    if (!arguments[1].getObject(runtime).isArrayBuffer(runtime)) {
      throw jsi::JSError(runtime, "Expected an ArrayBuffer");
    }
    auto data = arguments[1].getObject(runtime).getArrayBuffer(runtime);
    auto dataLayout = JsiTextureDataLayout::fromValue(runtime, arguments[2]);
    auto size = JsiExtent3D::fromValue(runtime, arguments[3]);

    getObject()->WriteTexture(destination, data.data(runtime),
                              data.size(runtime), dataLayout, size);

    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(writeBuffer) {

    auto buffer = JsiBuffer::fromValue(runtime, arguments[0]);
    auto offset = static_cast<uint64_t>(arguments[1].getNumber());
    auto data = arguments[2].getObject(runtime).getArrayBuffer(runtime);
    auto offset2 =
        count > 3 ? static_cast<uint64_t>(arguments[3].getNumber()) : 0;
    auto size = count > 4 ? static_cast<uint64_t>(arguments[4].getNumber())
                          : buffer->GetSize();
    getObject()->WriteBuffer(*buffer, offset, data.data(runtime) + offset2,
                             size);
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(onSubmittedWorkDone) {

    auto object = getObject();
    auto instance = getContext()->getInstance();
    return RNJsi::JsiPromises::createPromiseAsJSIValue(
        runtime, [object = std::move(object), instance = std::move(instance)](
                     jsi::Runtime &runtime,
                     std::shared_ptr<RNJsi::JsiPromises::Promise> promise) {
          RNSkLogger::logToConsole("onSubmittedWorkDone start");
          auto callback = [](WGPUQueueWorkDoneStatus status, void *userdata) {
            RNSkLogger::logToConsole("onSubmittedWorkDone callback status: " +
                                     std::to_string(static_cast<int>(status)));
            auto promise = static_cast<RNJsi::JsiPromises::Promise *>(userdata);
            promise->resolve(jsi::Value::undefined());
            RNSkLogger::logToConsole("onSubmittedWorkDone end");
          };
          wgpu::QueueWorkDoneCallbackInfo callbackInfo = {
              nullptr, wgpu::CallbackMode::WaitAnyOnly, callback,
              promise.get()};
          wgpu::Future future = object->OnSubmittedWorkDone(callbackInfo);
          wgpu::FutureWaitInfo waitInfo = {future};
          instance.WaitAny(1, &waitInfo, UINT64_MAX);
        });
  }

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiQueue, Queue)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiQueue, submit),
                       JSI_EXPORT_FUNC(JsiQueue, writeTexture),
                       JSI_EXPORT_FUNC(JsiQueue, writeBuffer),
                       JSI_EXPORT_FUNC(JsiQueue, onSubmittedWorkDone))

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::Queue *fromValue(jsi::Runtime &runtime, const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiQueue>(runtime)->getObject().get();
    } else {
      throw jsi::JSError(runtime, "Expected a JsiQueue object, but got a " +
                                      raw.toString(runtime).utf8(runtime));
    }
  }
};
} // namespace RNSkia
