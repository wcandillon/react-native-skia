#pragma once
#include <memory>
#include <string>
#include <utility>

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiEnums.h"
#include "JsiExtent3D.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkLog.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiTextureDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::TextureDescriptor> {
public:
  JsiTextureDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                       wgpu::TextureDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::TextureDescriptor>(
            context, std::make_shared<wgpu::TextureDescriptor>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiTextureDescriptor, TextureDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::TextureDescriptor *fromValue(jsi::Runtime &runtime,
                                            const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiTextureDescriptor>(runtime)->getObject().get();
    } else {
      auto object = new wgpu::TextureDescriptor();
      object->setDefault();

      if (obj.hasProperty(runtime, "size")) {
        auto size = obj.getProperty(runtime, "size");

        object->size = *JsiExtent3D::fromValue(runtime, size);
      } else {
        throw jsi::JSError(runtime,
                           "Missing mandatory prop size in TextureDescriptor");
      }
      if (obj.hasProperty(runtime, "format")) {
        auto format = obj.getProperty(runtime, "format");

        object->format =
            getTextureFormat(format.getString(runtime).utf8(runtime).c_str());
      } else {
        throw jsi::JSError(
            runtime, "Missing mandatory prop format in TextureDescriptor");
      }
      if (obj.hasProperty(runtime, "usage")) {
        auto usage = obj.getProperty(runtime, "usage");

        object->usage = static_cast<uint32_t>(usage.getNumber());
      } else {
        throw jsi::JSError(runtime,
                           "Missing mandatory prop usage in TextureDescriptor");
      }
      return object;
    }
  }
};
} // namespace RNSkia
