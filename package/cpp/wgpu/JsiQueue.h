#pragma once
#include <memory>
#include <string>
#include <utility>
#include <unistd.h> 
#include <mutex>
#include <condition_variable>

#include "dawn/webgpu_cpp.h"

#include <jsi/jsi.h>

#include "JsiCommandBuffer.h"
#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
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

JSI_HOST_FUNCTION(onSubmittedWorkDone) {
  bool done = false;
  // Define the callback function
  auto callback = [](WGPUQueueWorkDoneStatus status, void *userdata) {
    RNSkia::RNSkLogger::logToConsole("Status: %d", status);
    auto done = static_cast<bool *>(userdata);
    *done = true;
  };
  // Create QueueWorkDoneCallbackInfo struct
  wgpu::QueueWorkDoneCallbackInfo callbackInfo = {
    nullptr,                       // userdata is not used in the callback
    wgpu::CallbackMode::WaitAnyOnly, // Callback mode
    callback,                      // Callback function
    &done                          // Userdata (pointer to 'done' variable)
  };

  // Call OnSubmittedWorkDone with the proper argument
  wgpu::Future future = getObject()->OnSubmittedWorkDone(callbackInfo);
  // Setup wait information and wait
  wgpu::FutureWaitInfo waitInfo = {future};
  RNSkia::RNSkLogger::logToConsole("before WaitAny");
  getContext()->getInstance().WaitAny(1, &waitInfo, UINT64_MAX);
  RNSkia::RNSkLogger::logToConsole("after WaitAny");
  return jsi::Value::undefined();
}

  JSI_HOST_FUNCTION(writeBuffer) {

    auto buffer = JsiBuffer::fromValue(runtime, arguments[0]);
    auto offset = static_cast<uint64_t>(arguments[1].getNumber());
    auto data = arguments[2].getObject(runtime).getArrayBuffer(runtime);
    auto size = static_cast<uint64_t>(arguments[3].getNumber());
    getObject()->WriteBuffer(*buffer, offset, data.data(runtime), size);
    return jsi::Value::undefined();
  }

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiQueue, Queue)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiQueue, submit),
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
