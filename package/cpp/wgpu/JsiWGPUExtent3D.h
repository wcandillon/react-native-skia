#pragma once
#include <memory>
#include <string>
#include <utility>

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkLog.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiWGPUExtent3D
    : public JsiSkWrappingSharedPtrHostObject<wgpu::WGPUExtent3D> {
public:
  JsiWGPUExtent3D(std::shared_ptr<RNSkPlatformContext> context,
                  wgpu::WGPUExtent3D m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::WGPUExtent3D>(
            context, std::make_shared<wgpu::WGPUExtent3D>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiWGPUExtent3D, WGPUExtent3D)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::WGPUExtent3D *fromValue(jsi::Runtime &runtime,
                                       const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiWGPUExtent3D>(runtime)->getObject().get();
    } else {
      if (obj.isArray(runtime)) {
        auto jsiArray = obj.asArray(runtime);
        std::vector<double> array;
        for (int i = 0; i < jsiArray.size(runtime); i++) {
          array.push_back(jsiArray.getValueAtIndex(runtime, i).asNumber());
        }
        auto data = array.data();
        auto object =
            new wgpu::WGPUExtent3D(wgpu::WGPUExtent3D{data[0], data[1]});
        return object;
      }
      auto object = new wgpu::WGPUExtent3D();
      object->setDefault();

      if (obj.hasProperty(runtime, "width")) {
        auto width = obj.getProperty(runtime, "width");

        object->width = static_cast<uint32_t>(width.getNumber());
      } else {
        throw jsi::JSError(runtime,
                           "Missing mandatory prop width in WGPUExtent3D");
      }
      if (obj.hasProperty(runtime, "heigth")) {
        auto heigth = obj.getProperty(runtime, "heigth");

        object->heigth = static_cast<uint32_t>(heigth.getNumber());
      } else {
        throw jsi::JSError(runtime,
                           "Missing mandatory prop heigth in WGPUExtent3D");
      }
      return object;
    }
  }
};
} // namespace RNSkia
