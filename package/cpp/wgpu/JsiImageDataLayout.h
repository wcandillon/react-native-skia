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

class JsiImageDataLayout
    : public JsiSkWrappingSharedPtrHostObject<wgpu::ImageDataLayout> {
public:
  JsiImageDataLayout(std::shared_ptr<RNSkPlatformContext> context,
                     wgpu::ImageDataLayout m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::ImageDataLayout>(
            context, std::make_shared<wgpu::ImageDataLayout>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiImageDataLayout, ImageDataLayout)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::TextureDataLayout *fromValue(jsi::Runtime &runtime,
                                            const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiImageDataLayout>(runtime)->getObject().get();
    } else {
      auto object = new wgpu::TextureDataLayout();

      if (obj.hasProperty(runtime, "offset")) {
        auto offset = obj.getProperty(runtime, "offset");

        object->offset = static_cast<uint64_t>(offset.getNumber());
      }
      if (obj.hasProperty(runtime, "bytes per row")) {
        auto bytesPerRow = obj.getProperty(runtime, "bytes per row");

        object->bytesPerRow = static_cast<uint32_t>(bytesPerRow.getNumber());
      }
      if (obj.hasProperty(runtime, "rows per image")) {
        auto rowsPerImage = obj.getProperty(runtime, "rows per image");

        object->rowsPerImage = static_cast<uint32_t>(rowsPerImage.getNumber());
      }
      return object;
    }
  }
};
} // namespace RNSkia
