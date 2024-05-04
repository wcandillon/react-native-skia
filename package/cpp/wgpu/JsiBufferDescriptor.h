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
#include "JsiTextureView.h"
#include "MutableJSIBuffer.h"
#include "RNSkLog.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiBufferDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::BufferDescriptor> {
public:
  JsiBufferDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                      wgpu::BufferDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::BufferDescriptor>(
            context, std::make_shared<wgpu::BufferDescriptor>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiBufferDescriptor, BufferDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::BufferDescriptor *fromValue(jsi::Runtime &runtime,
                                           const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiBufferDescriptor>(runtime)->getObject().get();
    } else {
      auto object = new wgpu::BufferDescriptor();

      if (obj.hasProperty(runtime, "size")) {
        auto size = obj.getProperty(runtime, "size");

        object->size = static_cast<uint64_t>(size.getNumber());
      } else {
        throw jsi::JSError(runtime,
                           "Missing mandatory prop size in BufferDescriptor");
      }
      if (obj.hasProperty(runtime, "usage")) {
        auto usage = obj.getProperty(runtime, "usage");

        object->usage = static_cast<wgpu::BufferUsage>(usage.getNumber());
      } else {
        throw jsi::JSError(runtime,
                           "Missing mandatory prop usage in BufferDescriptor");
      }
      if (obj.hasProperty(runtime, "mappedAtCreation")) {
        auto mappedAtCreation = obj.getProperty(runtime, "mappedAtCreation");

        object->mappedAtCreation =
            static_cast<uint32_t>(mappedAtCreation.getBool());
      }
      return object;
    }
  }
};
} // namespace RNSkia
