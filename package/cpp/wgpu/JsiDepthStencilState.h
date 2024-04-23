#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiCompareFunction.h"
#include "JsiFloat.h"
#include "JsiInt32T.h"
#include "JsiStencilFaceState.h"
#include "JsiTextureFormat.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiDepthStencilState
    : public JsiSkWrappingSharedPtrHostObject<wgpu::DepthStencilState> {
public:
  JsiDepthStencilState(std::shared_ptr<RNSkPlatformContext> context,
                       wgpu::DepthStencilState m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::DepthStencilState>(
            context, std::make_shared<wgpu::DepthStencilState>(std::move(m))) {}

  EXPORT_JSI_API_BRANDNAME(JsiDepthStencilState, DepthStencilState)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::DepthStencilState>
  fromValue(jsi::Runtime &runtime, const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiDepthStencilState>(runtime)->getObject();
    } else {
      wgpu::DepthStencilState object;
      if (obj.hasProperty(runtime, "format")) {
        auto format = obj.getProperty(runtime, "format");
        object.format = JsiTextureFormat::fromValue(runtime, format);
      } else {
        throw jsi::JSError(runtime, "Missing mandatory prop format in format");
      }
      if (obj.hasProperty(runtime, "depthWriteEnabled")) {
        auto depthWriteEnabled = obj.getProperty(runtime, "depthWriteEnabled");
        object.depthWriteEnabled = depthWriteEnabled.getBool();
      }
      if (obj.hasProperty(runtime, "depthCompare")) {
        auto depthCompare = obj.getProperty(runtime, "depthCompare");
        object.depthCompare =
            JsiCompareFunction::fromValue(runtime, depthCompare);
      }
      if (obj.hasProperty(runtime, "stencilFront")) {
        auto stencilFront = obj.getProperty(runtime, "stencilFront");
        object.stencilFront =
            JsiStencilFaceState::fromValue(runtime, stencilFront);
      }
      if (obj.hasProperty(runtime, "stencilBack")) {
        auto stencilBack = obj.getProperty(runtime, "stencilBack");
        object.stencilBack =
            JsiStencilFaceState::fromValue(runtime, stencilBack);
      }
      if (obj.hasProperty(runtime, "stencilReadMask")) {
        auto stencilReadMask = obj.getProperty(runtime, "stencilReadMask");
        object.stencilReadMask =
            reinterpret_cast<uint32_t>(stencilReadMask.getNumber());
      }
      if (obj.hasProperty(runtime, "stencilWriteMask")) {
        auto stencilWriteMask = obj.getProperty(runtime, "stencilWriteMask");
        object.stencilWriteMask =
            reinterpret_cast<uint32_t>(stencilWriteMask.getNumber());
      }
      if (obj.hasProperty(runtime, "depthBias")) {
        auto depthBias = obj.getProperty(runtime, "depthBias");
        object.depthBias = JsiInt32T::fromValue(runtime, depthBias);
      }
      if (obj.hasProperty(runtime, "depthBiasSlopeScale")) {
        auto depthBiasSlopeScale =
            obj.getProperty(runtime, "depthBiasSlopeScale");
        object.depthBiasSlopeScale =
            JsiFloat::fromValue(runtime, depthBiasSlopeScale);
      }
      if (obj.hasProperty(runtime, "depthBiasClamp")) {
        auto depthBiasClamp = obj.getProperty(runtime, "depthBiasClamp");
        object.depthBiasClamp = JsiFloat::fromValue(runtime, depthBiasClamp);
      }
    }
  }
};
} // namespace RNSkia
