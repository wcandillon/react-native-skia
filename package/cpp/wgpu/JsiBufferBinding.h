#pragma once
#include <memory>
#include <string>
#include <utility>

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiBuffer.h"
#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkLog.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiBufferBinding
    : public JsiSkWrappingSharedPtrHostObject<wgpu::BufferBinding> {
public:
  JsiBufferBinding(std::shared_ptr<RNSkPlatformContext> context,
                   wgpu::BufferBinding m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::BufferBinding>(
            context, std::make_shared<wgpu::BufferBinding>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiBufferBinding, BufferBinding)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::BufferBinding *fromValue(jsi::Runtime &runtime,
                                        const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiBufferBinding>(runtime)->getObject().get();
    } else {
      auto object = new wgpu::BufferBinding();
      object->setDefault();

      if (obj.hasProperty(runtime, "buffer")) {
        auto buffer = obj.getProperty(runtime, "buffer");

        object->buffer = *JsiBuffer::fromValue(runtime, buffer);
      } else {
        throw jsi::JSError(runtime,
                           "Missing mandatory prop buffer in BufferBinding");
      }
      return object;
    }
  }
};
} // namespace RNSkia
