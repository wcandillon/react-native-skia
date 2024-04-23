#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiExtent2D.h"
#include "JsiExternalTexture.h"
#include "JsiOrigin3D.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiImageCopyExternalTexture
    : public JsiSkWrappingSharedPtrHostObject<wgpu::ImageCopyExternalTexture> {
public:
  JsiImageCopyExternalTexture(std::shared_ptr<RNSkPlatformContext> context,
                              wgpu::ImageCopyExternalTexture m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::ImageCopyExternalTexture>(
            context,
            std::make_shared<wgpu::ImageCopyExternalTexture>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiImageCopyExternalTexture, ImageCopyExternalTexture)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::ImageCopyExternalTexture>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiImageCopyExternalTexture>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
