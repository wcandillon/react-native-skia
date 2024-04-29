#pragma once
#include <memory>
#include <string>
#include <utility>

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkLog.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiBuffer : public JsiSkWrappingSharedPtrHostObject<wgpu::Buffer> {
public:
  JsiBuffer(std::shared_ptr<RNSkPlatformContext> context, wgpu::Buffer m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Buffer>(
            context, std::make_shared<wgpu::Buffer>(std::move(m))) {}

  JSI_HOST_FUNCTION(unmap) {

    getObject()->unmap();
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(getMappedRange) {

    size_t offset = static_cast<size_t>(arguments[0].getNumber());
    size_t size = static_cast<size_t>(arguments[1].getNumber());
    auto data = getObject()->getMappedRange(offset, size);
    auto arrayBufferCtor =
        runtime.global().getPropertyAsFunction(runtime, "ArrayBuffer");
    auto o =
        arrayBufferCtor.callAsConstructor(runtime, static_cast<double>(size))
            .getObject(runtime);
    auto buf = o.getArrayBuffer(runtime);
    memcpy(buf.data(runtime), data, size);
    return o;
  }

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiBuffer, Buffer)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiBuffer, unmap),
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
