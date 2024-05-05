#pragma once
#include <memory>
#include <string>
#include <utility>

#include "dawn/webgpu_cpp.h"

#include <jsi/jsi.h>

#include "JsiEnums.h"
#include "JsiExtent3D.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "JsiTexture.h"
#include "JsiTextureView.h"
#include "MutableJSIBuffer.h"
#include "RNSkLog.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiImageCopyTexture
    : public JsiSkWrappingSharedPtrHostObject<wgpu::ImageCopyTexture> {
public:
  JsiImageCopyTexture(std::shared_ptr<RNSkPlatformContext> context,
                      wgpu::ImageCopyTexture m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::ImageCopyTexture>(
            context, std::make_shared<wgpu::ImageCopyTexture>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiImageCopyTexture, ImageCopyTexture)

  static wgpu::ImageCopyTexture *fromValue(jsi::Runtime &runtime,
                                           const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiImageCopyTexture>(runtime)->getObject().get();
    } else {
      auto object = new wgpu::ImageCopyTexture();

      if (obj.hasProperty(runtime, "texture")) {
        auto texture = obj.getProperty(runtime, "texture");

        object->texture = *JsiTexture::fromValue(runtime, texture);
      } else {
        throw jsi::JSError(
            runtime, "Missing mandatory prop texture in ImageCopyTexture");
      }
      if (obj.hasProperty(runtime, "mipLevel")) {
        auto mipLevel = obj.getProperty(runtime, "mipLevel");

        object->mipLevel = static_cast<uint32_t>(mipLevel.getNumber());
      }
      if (obj.hasProperty(runtime, "origin")) {
        auto origin = obj.getProperty(runtime, "origin").asObject(runtime);
        auto x = origin.hasProperty(runtime, "x")
                     ? origin.getProperty(runtime, "x").getNumber()
                     : 0;
        auto y = origin.hasProperty(runtime, "y")
                     ? origin.getProperty(runtime, "y").getNumber()
                     : 0;
        auto z = origin.hasProperty(runtime, "z")
                     ? origin.getProperty(runtime, "z").getNumber()
                     : 0;
        object->origin = {static_cast<uint32_t>(x), static_cast<uint32_t>(y),
                          static_cast<uint32_t>(z)};
      } else {
        throw jsi::JSError(runtime,
                           "Missing mandatory prop origin in ImageCopyTexture");
      }
      if (obj.hasProperty(runtime, "aspect")) {
        auto aspect = obj.getProperty(runtime, "aspect");

        object->aspect =
            getTextureAspect(aspect.getString(runtime).utf8(runtime).c_str());
      }
      return object;
    }
  }
};
} // namespace RNSkia
