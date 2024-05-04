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

class JsiExtent3D : public JsiSkWrappingSharedPtrHostObject<wgpu::Extent3D> {
public:
  JsiExtent3D(std::shared_ptr<RNSkPlatformContext> context, wgpu::Extent3D m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Extent3D>(
            context, std::make_shared<wgpu::Extent3D>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiExtent3D, Extent3D)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::Extent3D *fromValue(jsi::Runtime &runtime,
                                   const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiExtent3D>(runtime)->getObject().get();
    } else {
      auto object = new wgpu::Extent3D();

      if (obj.hasProperty(runtime, "width")) {
        auto width = obj.getProperty(runtime, "width");

        object->width = static_cast<uint32_t>(width.getNumber());
      } else {
        throw jsi::JSError(runtime, "Missing mandatory prop width in Extent3D");
      }
      if (obj.hasProperty(runtime, "height")) {
        auto height = obj.getProperty(runtime, "height");

        object->height = static_cast<uint32_t>(height.getNumber());
      } else {
        throw jsi::JSError(runtime,
                           "Missing mandatory prop height in Extent3D");
      }
      return object;
    }
  }
};
} // namespace RNSkia
