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
#include "JsiStencilFaceState.h"
#include "JsiTextureView.h"
#include "MutableJSIBuffer.h"
#include "RNSkLog.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiDepthStencilState
    : public JsiSkWrappingSharedPtrHostObject<wgpu::DepthStencilState> {
public:
  JsiDepthStencilState(std::shared_ptr<RNSkPlatformContext> context,
                       wgpu::DepthStencilState m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::DepthStencilState>(
            context, std::make_shared<wgpu::DepthStencilState>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiDepthStencilState, DepthStencilState)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::DepthStencilState *fromValue(jsi::Runtime &runtime,
                                            const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiDepthStencilState>(runtime)->getObject().get();
    } else {
      auto object = new wgpu::DepthStencilState();

      if (obj.hasProperty(runtime, "format")) {
        auto format = obj.getProperty(runtime, "format");

        object->format =
            getTextureFormat(format.getString(runtime).utf8(runtime).c_str());
      } else {
        throw jsi::JSError(
            runtime, "Missing mandatory prop format in DepthStencilState");
      }
      if (obj.hasProperty(runtime, "depthWriteEnabled")) {
        auto depthWriteEnabled = obj.getProperty(runtime, "depthWriteEnabled");

        object->depthWriteEnabled =
            static_cast<uint32_t>(depthWriteEnabled.getBool());
      }
      if (obj.hasProperty(runtime, "depthCompare")) {
        auto depthCompare = obj.getProperty(runtime, "depthCompare");

        object->depthCompare = getCompareFunction(
            depthCompare.getString(runtime).utf8(runtime).c_str());
      }
      if (obj.hasProperty(runtime, "stencilFront")) {
        auto stencilFront = obj.getProperty(runtime, "stencilFront");

        object->stencilFront =
            *JsiStencilFaceState::fromValue(runtime, stencilFront);
      }
      if (obj.hasProperty(runtime, "stencilBack")) {
        auto stencilBack = obj.getProperty(runtime, "stencilBack");

        object->stencilBack =
            *JsiStencilFaceState::fromValue(runtime, stencilBack);
      }
      if (obj.hasProperty(runtime, "stencilReadMask")) {
        auto stencilReadMask = obj.getProperty(runtime, "stencilReadMask");

        object->stencilReadMask =
            static_cast<uint32_t>(stencilReadMask.getNumber());
      }
      if (obj.hasProperty(runtime, "stencilWriteMask")) {
        auto stencilWriteMask = obj.getProperty(runtime, "stencilWriteMask");

        object->stencilWriteMask =
            static_cast<uint32_t>(stencilWriteMask.getNumber());
      }
      if (obj.hasProperty(runtime, "depthBias")) {
        auto depthBias = obj.getProperty(runtime, "depthBias");

        object->depthBias = static_cast<int32_t>(depthBias.getNumber());
      }
      if (obj.hasProperty(runtime, "depthBiasSlopeScale")) {
        auto depthBiasSlopeScale =
            obj.getProperty(runtime, "depthBiasSlopeScale");

        object->depthBiasSlopeScale =
            static_cast<float>(depthBiasSlopeScale.getNumber());
      }
      if (obj.hasProperty(runtime, "depthBiasClamp")) {
        auto depthBiasClamp = obj.getProperty(runtime, "depthBiasClamp");

        object->depthBiasClamp = static_cast<float>(depthBiasClamp.getNumber());
      }
      return object;
    }
  }
};
} // namespace RNSkia
