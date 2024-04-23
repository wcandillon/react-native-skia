#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiOrigin3D.h"
#include "JsiTexture.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiImageCopyTexture
    : public JsiSkWrappingSharedPtrHostObject<wgpu::ImageCopyTexture> {
public:
  JsiImageCopyTexture(std::shared_ptr<RNSkPlatformContext> context,
                      wgpu::ImageCopyTexture m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::ImageCopyTexture>(
            context, std::make_shared<wgpu::ImageCopyTexture>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiImageCopyTexture, ImageCopyTexture)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::ImageCopyTexture>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiImageCopyTexture>(runtime)->getObject();
  }
};
} // namespace RNSkia
