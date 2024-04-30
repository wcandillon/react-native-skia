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

class JsiBindingResource
    : public JsiSkWrappingSharedPtrHostObject<wgpu::BindingResource> {
public:
  JsiBindingResource(std::shared_ptr<RNSkPlatformContext> context,
                     wgpu::BindingResource m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::BindingResource>(
            context, std::make_shared<wgpu::BindingResource>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiBindingResource, BindingResource)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::BindingResource *fromValue(jsi::Runtime &runtime,
                                          const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiBindingResource>(runtime)->getObject().get();
    } else {
      auto object = new wgpu::BindingResource();
      object->setDefault();

      if (obj.hasProperty(runtime, "buffer")) {
        auto buffer = obj.getProperty(runtime, "buffer");

        object->buffer = *JsiBuffer::fromValue(runtime, buffer);
      } else {
        throw jsi::JSError(runtime,
                           "Missing mandatory prop buffer in BindingResource");
      }
      return object;
    }
  }
};
} // namespace RNSkia
