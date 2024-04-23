#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiBuffer.h"
#include "JsiTextureDataLayout.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiImageCopyBuffer
    : public JsiSkWrappingSharedPtrHostObject<wgpu::ImageCopyBuffer> {
public:
  JsiImageCopyBuffer(std::shared_ptr<RNSkPlatformContext> context,
                     wgpu::ImageCopyBuffer m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::ImageCopyBuffer>(
            context, std::make_shared<wgpu::ImageCopyBuffer>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiImageCopyBuffer, ImageCopyBuffer)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::ImageCopyBuffer>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiImageCopyBuffer>(runtime)->getObject();
  }
};
} // namespace RNSkia
