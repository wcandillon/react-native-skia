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

class JsiTextureDataLayout
    : public JsiSkWrappingSharedPtrHostObject<wgpu::TextureDataLayout> {
public:
  JsiTextureDataLayout(std::shared_ptr<RNSkPlatformContext> context,
                       wgpu::TextureDataLayout m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::TextureDataLayout>(
            context, std::make_shared<wgpu::TextureDataLayout>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiTextureDataLayout, TextureDataLayout)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::TextureDataLayout *fromValue(jsi::Runtime &runtime,
                                            const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiTextureDataLayout>(runtime)->getObject().get();
    } else {
      auto object = new wgpu::TextureDataLayout();

      if (obj.hasProperty(runtime, "offset")) {
        auto offset = obj.getProperty(runtime, "offset");

        object->offset = static_cast<uint64_t>(offset.getNumber());
      }
      if (obj.hasProperty(runtime, "bytesPerRow")) {
        auto bytesPerRow = obj.getProperty(runtime, "bytesPerRow");

        object->bytesPerRow = static_cast<uint32_t>(bytesPerRow.getNumber());
      }
      if (obj.hasProperty(runtime, "rowsPerImage")) {
        auto rowsPerImage = obj.getProperty(runtime, "rowsPerImage");

        object->rowsPerImage = static_cast<uint32_t>(rowsPerImage.getNumber());
      }
      return object;
    }
  }
};
} // namespace RNSkia
