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
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiColor : public JsiSkWrappingSharedPtrHostObject<wgpu::Color> {
public:
  JsiColor(std::shared_ptr<RNSkPlatformContext> context, wgpu::Color m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Color>(
            context, std::make_shared<wgpu::Color>(std::move(m))) {}

  EXPORT_JSI_API_BRANDNAME(JsiColor, Color)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::Color> fromValue(jsi::Runtime &runtime,
                                                const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiColor>(runtime)->getObject();
    } else {
      auto object = std::make_shared<wgpu::Color>();
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
