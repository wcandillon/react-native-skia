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

class JsiSamplerDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::SamplerDescriptor> {
public:
  JsiSamplerDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                       wgpu::SamplerDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::SamplerDescriptor>(
            context, std::make_shared<wgpu::SamplerDescriptor>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiSamplerDescriptor, SamplerDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::SamplerDescriptor *fromValue(jsi::Runtime &runtime,
                                            const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiSamplerDescriptor>(runtime)->getObject().get();
    } else {
      auto object = new wgpu::SamplerDescriptor();

      if (obj.hasProperty(runtime, "addressModeU")) {
        auto addressModeU = obj.getProperty(runtime, "addressModeU");

        object->addressModeU = getAddressMode(
            addressModeU.getString(runtime).utf8(runtime).c_str());
      }
      if (obj.hasProperty(runtime, "addressModeV")) {
        auto addressModeV = obj.getProperty(runtime, "addressModeV");

        object->addressModeV = getAddressMode(
            addressModeV.getString(runtime).utf8(runtime).c_str());
      }
      if (obj.hasProperty(runtime, "addressModeW")) {
        auto addressModeW = obj.getProperty(runtime, "addressModeW");

        object->addressModeW = getAddressMode(
            addressModeW.getString(runtime).utf8(runtime).c_str());
      }
      if (obj.hasProperty(runtime, "magFilter")) {
        auto magFilter = obj.getProperty(runtime, "magFilter");

        object->magFilter =
            getFilterMode(magFilter.getString(runtime).utf8(runtime).c_str());
      }
      if (obj.hasProperty(runtime, "minFilter")) {
        auto minFilter = obj.getProperty(runtime, "minFilter");

        object->minFilter =
            getFilterMode(minFilter.getString(runtime).utf8(runtime).c_str());
      }
      if (obj.hasProperty(runtime, "mipmapFilter")) {
        auto mipmapFilter = obj.getProperty(runtime, "mipmapFilter");

        object->mipmapFilter = getMipmapFilterMode(
            mipmapFilter.getString(runtime).utf8(runtime).c_str());
      }
      if (obj.hasProperty(runtime, "lodMinClamp")) {
        auto lodMinClamp = obj.getProperty(runtime, "lodMinClamp");

        object->lodMinClamp = static_cast<float>(lodMinClamp.getNumber());
      }
      if (obj.hasProperty(runtime, "lodMaxClamp")) {
        auto lodMaxClamp = obj.getProperty(runtime, "lodMaxClamp");

        object->lodMaxClamp = static_cast<float>(lodMaxClamp.getNumber());
      }
      return object;
    }
  }
};
} // namespace RNSkia
