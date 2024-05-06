#pragma once
#include <memory>
#include <string>
#include <utility>

#include "dawn/webgpu_cpp.h"

#include <jsi/jsi.h>

#include "JsiBuffer.h"
#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSampler.h"
#include "JsiSkHostObjects.h"
#include "JsiTextureView.h"
#include "MutableJSIBuffer.h"
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

  static wgpu::BindGroupEntry *fromValue(jsi::Runtime &runtime,
                                         const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiBindGroupEntry>(runtime)->getObject().get();
    } else {
      auto object = new wgpu::BindGroupEntry();

      if (obj.hasProperty(runtime, "binding")) {
        auto binding = obj.getProperty(runtime, "binding");

        object->binding = static_cast<uint32_t>(binding.getNumber());
      } else {
        throw jsi::JSError(runtime,
                           "Missing mandatory prop binding in BindGroupEntry");
      }

      if (obj.hasProperty(runtime, "resource") &&
          obj.getProperty(runtime, "resource").isObject()) {
        auto resource = obj.getProperty(runtime, "resource").asObject(runtime);
        if (resource.isHostObject(runtime)) {
          if (auto textureView = dynamic_pointer_cast<JsiTextureView>(
                  resource.asHostObject(runtime))) {
            object->textureView = *JsiTextureView::fromValue(
                runtime, obj.getProperty(runtime, "resource"));
          } else if (auto sampler = dynamic_pointer_cast<JsiSampler>(
                         resource.asHostObject(runtime))) {
            object->sampler = *JsiSampler::fromValue(
                runtime, obj.getProperty(runtime, "resource"));
          } else {
            throw jsi::JSError(runtime, "Missing mandatory prop textureView or "
                                        "sampler in BindGroupEntry");
          }
        } else {
          if (resource.hasProperty(runtime, "buffer")) {
            auto buffer = resource.getProperty(runtime, "buffer");

            object->buffer = *JsiBuffer::fromValue(runtime, buffer);
          } else {
            throw jsi::JSError(
                runtime, "Missing mandatory prop buffer in BindGroupEntry");
          }
          if (resource.hasProperty(runtime, "size")) {
            auto size = resource.getProperty(runtime, "size");

            object->size = static_cast<uint32_t>(size.getNumber());
          } else {
            object->size = object->buffer.GetSize();
          }
          if (resource.hasProperty(runtime, "offset")) {
            auto offset = resource.getProperty(runtime, "offset");

            object->offset = static_cast<uint32_t>(offset.getNumber());
          } else {
            object->offset = 0;
          }
        }
      } else {
        throw jsi::JSError(runtime,
                           "Missing mandatory prop binding in BindGroupEntry");
      }
      return object;
    }
  }
};
} // namespace RNSkia
