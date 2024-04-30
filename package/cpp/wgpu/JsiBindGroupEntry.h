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

class JsiBindGroupEntry
    : public JsiSkWrappingSharedPtrHostObject<wgpu::BindGroupEntry> {
public:
  JsiBindGroupEntry(std::shared_ptr<RNSkPlatformContext> context,
                    wgpu::BindGroupEntry m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::BindGroupEntry>(
            context, std::make_shared<wgpu::BindGroupEntry>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiBindGroupEntry, BindGroupEntry)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::BindGroupEntry *fromValue(jsi::Runtime &runtime,
                                         const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiBindGroupEntry>(runtime)->getObject().get();
    } else {
      auto object = new wgpu::BindGroupEntry();
      object->setDefault();

      if (obj.hasProperty(runtime, "binding")) {
        auto binding = obj.getProperty(runtime, "binding");

        object->binding = static_cast<uint32_t>(binding.getNumber());
      } else {
        throw jsi::JSError(runtime,
                           "Missing mandatory prop binding in BindGroupEntry");
      }
      if (obj.hasProperty(runtime, "buffer")) {
        auto buffer = obj.getProperty(runtime, "buffer");

        object->buffer = *JsiBuffer::fromValue(runtime, buffer);
      } else {
        throw jsi::JSError(runtime,
                           "Missing mandatory prop buffer in BindGroupEntry");
      }
      return object;
    }
  }
};
} // namespace RNSkia
