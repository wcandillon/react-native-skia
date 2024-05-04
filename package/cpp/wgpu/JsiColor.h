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

class JsiColor : public JsiSkWrappingSharedPtrHostObject<wgpu::Color> {
public:
  JsiColor(std::shared_ptr<RNSkPlatformContext> context, wgpu::Color m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Color>(
            context, std::make_shared<wgpu::Color>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiColor, Color)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::Color *fromValue(jsi::Runtime &runtime, const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiColor>(runtime)->getObject().get();
    } else {
      if (obj.isArray(runtime)) {
        auto jsiArray = obj.asArray(runtime);
        std::vector<double> array;
        for (int i = 0; i < jsiArray.size(runtime); i++) {
          array.push_back(jsiArray.getValueAtIndex(runtime, i).asNumber());
        }
        auto data = array.data();
        auto object =
            new wgpu::Color(wgpu::Color{data[0], data[1], data[2], data[3]});
        return object;
      }
      auto object = new wgpu::Color();

      if (obj.hasProperty(runtime, "r")) {
        auto r = obj.getProperty(runtime, "r");

        object->r = r.getNumber();
      } else {
        throw jsi::JSError(runtime, "Missing mandatory prop r in Color");
      }
      if (obj.hasProperty(runtime, "g")) {
        auto g = obj.getProperty(runtime, "g");

        object->g = g.getNumber();
      } else {
        throw jsi::JSError(runtime, "Missing mandatory prop g in Color");
      }
      if (obj.hasProperty(runtime, "b")) {
        auto b = obj.getProperty(runtime, "b");

        object->b = b.getNumber();
      } else {
        throw jsi::JSError(runtime, "Missing mandatory prop b in Color");
      }
      if (obj.hasProperty(runtime, "a")) {
        auto a = obj.getProperty(runtime, "a");

        object->a = a.getNumber();
      } else {
        throw jsi::JSError(runtime, "Missing mandatory prop a in Color");
      }
      return object;
    }
  }
};
} // namespace RNSkia
