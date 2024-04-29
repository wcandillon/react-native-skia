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

class JsiSize : public JsiSkWrappingSharedPtrHostObject<wgpu::Size> {
public:
  JsiSize(std::shared_ptr<RNSkPlatformContext> context, wgpu::Size m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Size>(
            context, std::make_shared<wgpu::Size>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiSize, Size)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::Size *fromValue(jsi::Runtime &runtime, const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiSize>(runtime)->getObject().get();
    } else {
      if (obj.isArray(runtime)) {
        auto jsiArray = obj.asArray(runtime);
        std::vector<double> array;
        for (int i = 0; i < jsiArray.size(runtime); i++) {
          array.push_back(jsiArray.getValueAtIndex(runtime, i).asNumber());
        }
        auto data = array.data();
        auto object = new wgpu::Size(wgpu::Size{data[0], data[1]});
        return object;
      }
      auto object = new wgpu::Size();
      object->setDefault();

      if (obj.hasProperty(runtime, "width")) {
        auto width = obj.getProperty(runtime, "width");

        object->width = static_cast<uint32_t>(width.getNumber());
      } else {
        throw jsi::JSError(runtime, "Missing mandatory prop width in Size");
      }
      if (obj.hasProperty(runtime, "heigth")) {
        auto heigth = obj.getProperty(runtime, "heigth");

        object->heigth = static_cast<uint32_t>(heigth.getNumber());
      } else {
        throw jsi::JSError(runtime, "Missing mandatory prop heigth in Size");
      }
      return object;
    }
  }
};
} // namespace RNSkia
