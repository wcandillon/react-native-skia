#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiCullMode.h"
#include "JsiFrontFace.h"
#include "JsiIndexFormat.h"
#include "JsiPrimitiveTopology.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiPrimitiveState
    : public JsiSkWrappingSharedPtrHostObject<wgpu::PrimitiveState> {
public:
  JsiPrimitiveState(std::shared_ptr<RNSkPlatformContext> context,
                    wgpu::PrimitiveState m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::PrimitiveState>(
            context, std::make_shared<wgpu::PrimitiveState>(std::move(m))) {}

  EXPORT_JSI_API_BRANDNAME(JsiPrimitiveState, PrimitiveState)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::PrimitiveState>
  fromValue(jsi::Runtime &runtime, const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiPrimitiveState>(runtime)->getObject();
    } else {
      wgpu::PrimitiveState object;
      if (obj.hasProperty(runtime, "topology")) {
        auto topology = obj.getProperty(runtime, "topology");
        object.topology = JsiPrimitiveTopology::fromValue(runtime, topology);
      }
      if (obj.hasProperty(runtime, "stripIndexFormat")) {
        auto stripIndexFormat = obj.getProperty(runtime, "stripIndexFormat");
        object.stripIndexFormat =
            JsiIndexFormat::fromValue(runtime, stripIndexFormat);
      }
      if (obj.hasProperty(runtime, "frontFace")) {
        auto frontFace = obj.getProperty(runtime, "frontFace");
        object.frontFace = JsiFrontFace::fromValue(runtime, frontFace);
      }
      if (obj.hasProperty(runtime, "cullMode")) {
        auto cullMode = obj.getProperty(runtime, "cullMode");
        object.cullMode = JsiCullMode::fromValue(runtime, cullMode);
      }
      if (obj.hasProperty(runtime, "unclippedDepth")) {
        auto unclippedDepth = obj.getProperty(runtime, "unclippedDepth");
        object.unclippedDepth = unclippedDepth.getBool();
      }
    }
  }
};
} // namespace RNSkia
