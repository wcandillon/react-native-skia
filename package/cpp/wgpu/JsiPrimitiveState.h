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

class JsiPrimitiveState
    : public JsiSkWrappingSharedPtrHostObject<wgpu::PrimitiveState> {
public:
  JsiPrimitiveState(std::shared_ptr<RNSkPlatformContext> context,
                    wgpu::PrimitiveState m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::PrimitiveState>(
            context, std::make_shared<wgpu::PrimitiveState>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiPrimitiveState, PrimitiveState)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::PrimitiveState *fromValue(jsi::Runtime &runtime,
                                         const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiPrimitiveState>(runtime)->getObject().get();
    } else {
      auto object = new wgpu::PrimitiveState();
      object->setDefault();

      if (obj.hasProperty(runtime, "topology")) {
        auto topology = obj.getProperty(runtime, "topology");

        object->topology = getPrimitiveTopology(
            topology.getString(runtime).utf8(runtime).c_str());
      }
      if (obj.hasProperty(runtime, "stripIndexFormat")) {
        auto stripIndexFormat = obj.getProperty(runtime, "stripIndexFormat");

        object->stripIndexFormat = getIndexFormat(
            stripIndexFormat.getString(runtime).utf8(runtime).c_str());
      }
      if (obj.hasProperty(runtime, "frontFace")) {
        auto frontFace = obj.getProperty(runtime, "frontFace");

        object->frontFace =
            getFrontFace(frontFace.getString(runtime).utf8(runtime).c_str());
      }
      if (obj.hasProperty(runtime, "cullMode")) {
        auto cullMode = obj.getProperty(runtime, "cullMode");

        object->cullMode =
            getCullMode(cullMode.getString(runtime).utf8(runtime).c_str());
      }
      return object;
    }
  }
};
} // namespace RNSkia
