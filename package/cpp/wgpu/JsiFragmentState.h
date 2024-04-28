#pragma once
#include <memory>
#include <string>
#include <utility>

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiColorTargetState.h"
#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiShaderModule.h"
#include "JsiSkHostObjects.h"
#include "RNSkLog.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiFragmentState
    : public JsiSkWrappingSharedPtrHostObject<wgpu::FragmentState> {
public:
  JsiFragmentState(std::shared_ptr<RNSkPlatformContext> context,
                   wgpu::FragmentState m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::FragmentState>(
            context, std::make_shared<wgpu::FragmentState>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiFragmentState, FragmentState)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::FragmentState> fromValue(jsi::Runtime &runtime,
                                                        const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiFragmentState>(runtime)->getObject();
    } else {
      auto object = std::make_shared<wgpu::FragmentState>();

      if (obj.hasProperty(runtime, "module")) {
        auto module = obj.getProperty(runtime, "module");

        object->module = *JsiShaderModule::fromValue(runtime, module).get();
      } else {
        throw jsi::JSError(runtime,
                           "Missing mandatory prop module in FragmentState");
      }
      if (obj.hasProperty(runtime, "entryPoint")) {
        auto entryPoint = obj.getProperty(runtime, "entryPoint");

        object->entryPoint =
            strdup(entryPoint.getString(runtime).utf8(runtime).c_str());
      } else {
        throw jsi::JSError(
            runtime, "Missing mandatory prop entryPoint in FragmentState");
      }
      if (obj.hasProperty(runtime, "targets")) {
        // Configure blend state

      }
              wgpu::BlendState blendState;
        // Usual alpha blending for the color:
        blendState.color.srcFactor = wgpu::BlendFactor::SrcAlpha;
        blendState.color.dstFactor = wgpu::BlendFactor::OneMinusSrcAlpha;
        blendState.color.operation = wgpu::BlendOperation::Add;
        // We leave the target alpha untouched:
        blendState.alpha.srcFactor = wgpu::BlendFactor::Zero;
        blendState.alpha.dstFactor = wgpu::BlendFactor::One;
        blendState.alpha.operation = wgpu::BlendOperation::Add;
        wgpu::ColorTargetState colorTarget;
        colorTarget.format = wgpu::TextureFormat::BGRA8Unorm;
        colorTarget.blend = &blendState;
        colorTarget.writeMask = wgpu::ColorWriteMask::All; // We could write to only some of the color channels.
        // We have only one target because our render pass has only one output color
        // attachment.
        object->targetCount = 1;
        object->targets = &colorTarget;
      return object;
    }
  }
};
} // namespace RNSkia
