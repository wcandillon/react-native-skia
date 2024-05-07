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

class JsiTextureViewDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::TextureViewDescriptor> {
public:
  JsiTextureViewDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                           wgpu::TextureViewDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::TextureViewDescriptor>(
            context,
            std::make_shared<wgpu::TextureViewDescriptor>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiTextureViewDescriptor, TextureViewDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::TextureViewDescriptor *fromValue(jsi::Runtime &runtime,
                                                const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiTextureViewDescriptor>(runtime)
          ->getObject()
          .get();
    } else {
      auto object = new wgpu::TextureViewDescriptor();

      if (obj.hasProperty(runtime, "format")) {
        auto format = obj.getProperty(runtime, "format");

        object->format =
            getTextureFormat(format.getString(runtime).utf8(runtime).c_str());
      }
      if (obj.hasProperty(runtime, "dimension")) {
        auto dimension = obj.getProperty(runtime, "dimension");

        object->dimension = getTextureViewDimension(
            dimension.getString(runtime).utf8(runtime).c_str());
      }
      if (obj.hasProperty(runtime, "baseMipLevel")) {
        auto baseMipLevel = obj.getProperty(runtime, "baseMipLevel");

        object->baseMipLevel = static_cast<uint32_t>(baseMipLevel.getNumber());
      }
      if (obj.hasProperty(runtime, "mipLevelCount")) {
        auto mipLevelCount = obj.getProperty(runtime, "mipLevelCount");

        object->mipLevelCount =
            static_cast<uint32_t>(mipLevelCount.getNumber());
      }
      return object;
    }
  }
};
} // namespace RNSkia
