#pragma once
#include <memory>
#include <string>
#include <utility>

#include "dawn/webgpu_cpp.h"

#include <jsi/jsi.h>

#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkLog.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

struct GPUBuffer : jsi::MutableBuffer {
  GPUBuffer(void* data, size_t size) : _data(data), _size(size) {}

  size_t size() const override {
    return _size;
  }

  uint8_t *data() override {
    return reinterpret_cast<uint8_t *>(_data);
  }

  void* _data;
  size_t _size;
};

class JsiBuffer : public JsiSkWrappingSharedPtrHostObject<wgpu::Buffer> {
public:
  JsiBuffer(std::shared_ptr<RNSkPlatformContext> context, wgpu::Buffer m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Buffer>(
            context, std::make_shared<wgpu::Buffer>(std::move(m))) {}

  JSI_HOST_FUNCTION(unmap) {

    getObject()->Unmap();
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(mapAsync) {
    auto mode = static_cast<wgpu::MapMode>(arguments[0].getNumber());
    auto offset = static_cast<uint32_t>(arguments[1].getNumber());
    auto size = static_cast<uint32_t>(arguments[2].getNumber());
    auto object = getObject();
    auto instance = getContext()->getInstance();
    return RNJsi::JsiPromises::createPromiseAsJSIValue(
        runtime, [object = std::move(object), mode, offset, size,
                  instance = std::move(instance)](
                     jsi::Runtime &runtime,
                     std::shared_ptr<RNJsi::JsiPromises::Promise> promise) {
          RNSkLogger::logToConsole("Buffer::MapAsync start");
          auto callback = [](WGPUBufferMapAsyncStatus status, void *userdata) {
            RNSkLogger::logToConsole("Buffer::MapAsync callback status: " +
                                     std::to_string(static_cast<int>(status)));
            auto promise = static_cast<RNJsi::JsiPromises::Promise *>(userdata);
            promise->resolve(jsi::Value::undefined());
          };
          wgpu::BufferMapCallbackInfo callbackInfo = {
              nullptr, wgpu::CallbackMode::WaitAnyOnly, callback,
              promise.get()};
          wgpu::Future future =
              object->MapAsync(mode, offset, size, callbackInfo);
          wgpu::FutureWaitInfo waitInfo = {future};
          RNSkia::RNSkLogger::logToConsole("before WaitAny");
          instance.WaitAny(1, &waitInfo, UINT64_MAX);
        });
  }

  JSI_HOST_FUNCTION(getMappedRange) {
    size_t offset = static_cast<size_t>(arguments[0].getNumber());
    size_t size = static_cast<size_t>(arguments[1].getNumber());
    auto usage = getObject()->GetUsage();
    void *data =  (usage & wgpu::BufferUsage::MapWrite)
          ? getObject()->GetMappedRange(offset, size)
          : const_cast<void*>(getObject()->GetConstMappedRange(offset, size));
    if (data == nullptr) {
      throw jsi::JSError(runtime, "Buffer::GetMappedRange failed");
    }
    auto buf = std::make_shared<GPUBuffer>(data, size);
    auto val = jsi::ArrayBuffer(runtime, buf);
    return val;
  }

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiBuffer, Buffer)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiBuffer, unmap),
                       JSI_EXPORT_FUNC(JsiBuffer, mapAsync),
                       JSI_EXPORT_FUNC(JsiBuffer, getMappedRange))

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::Buffer *fromValue(jsi::Runtime &runtime, const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiBuffer>(runtime)->getObject().get();
    } else {
      throw jsi::JSError(runtime, "Expected a JsiBuffer object, but got a " +
                                      raw.toString(runtime).utf8(runtime));
    }
  }
};
} // namespace RNSkia
