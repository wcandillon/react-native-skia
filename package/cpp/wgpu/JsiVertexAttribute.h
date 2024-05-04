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

class JsiVertexAttribute
    : public JsiSkWrappingSharedPtrHostObject<wgpu::VertexAttribute> {
public:
  JsiVertexAttribute(std::shared_ptr<RNSkPlatformContext> context,
                     wgpu::VertexAttribute m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::VertexAttribute>(
            context, std::make_shared<wgpu::VertexAttribute>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiVertexAttribute, VertexAttribute)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::VertexAttribute *fromValue(jsi::Runtime &runtime,
                                          const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiVertexAttribute>(runtime)->getObject().get();
    } else {
      auto object = new wgpu::VertexAttribute();

      if (obj.hasProperty(runtime, "shaderLocation")) {
        auto shaderLocation = obj.getProperty(runtime, "shaderLocation");

        object->shaderLocation =
            static_cast<uint32_t>(shaderLocation.getNumber());
      } else {
        throw jsi::JSError(
            runtime,
            "Missing mandatory prop shaderLocation in VertexAttribute");
      }
      if (obj.hasProperty(runtime, "format")) {
        auto format = obj.getProperty(runtime, "format");

        object->format =
            getVertexFormat(format.getString(runtime).utf8(runtime).c_str());
      } else {
        throw jsi::JSError(runtime,
                           "Missing mandatory prop format in VertexAttribute");
      }
      if (obj.hasProperty(runtime, "offset")) {
        auto offset = obj.getProperty(runtime, "offset");

        object->offset = static_cast<uint32_t>(offset.getNumber());
      } else {
        throw jsi::JSError(runtime,
                           "Missing mandatory prop offset in VertexAttribute");
      }
      return object;
    }
  }
};
} // namespace RNSkia
