#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiDepthStencilState.h"
#include "JsiFragmentState.h"
#include "JsiMultisampleState.h"
#include "JsiPrimitiveState.h"
#include "JsiVertexState.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiRenderPipelineDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::RenderPipelineDescriptor> {
public:
  JsiRenderPipelineDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                              wgpu::RenderPipelineDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::RenderPipelineDescriptor>(
            context,
            std::make_shared<wgpu::RenderPipelineDescriptor>(std::move(m))) {}

  EXPORT_JSI_API_BRANDNAME(JsiRenderPipelineDescriptor,
                           RenderPipelineDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::RenderPipelineDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiRenderPipelineDescriptor>(runtime)
          ->getObject();
    } else {
      wgpu::RenderPipelineDescriptor object;
      if (obj.hasProperty(runtime, "vertex")) {
        auto vertex = obj.getProperty(runtime, "vertex");
        object.vertex = JsiVertexState::fromValue(runtime, vertex);
      } else {
        throw jsi::JSError(runtime, "Missing mandatory prop vertex in vertex");
      }
      if (obj.hasProperty(runtime, "primitive")) {
        auto primitive = obj.getProperty(runtime, "primitive");
        object.primitive = JsiPrimitiveState::fromValue(runtime, primitive);
      } else {
        throw jsi::JSError(runtime,
                           "Missing mandatory prop primitive in primitive");
      }
      if (obj.hasProperty(runtime, "depthStencil")) {
        auto depthStencil = obj.getProperty(runtime, "depthStencil");
        object.depthStencil =
            JsiDepthStencilState::fromValue(runtime, depthStencil);
      }
      if (obj.hasProperty(runtime, "multisample")) {
        auto multisample = obj.getProperty(runtime, "multisample");
        object.multisample =
            JsiMultisampleState::fromValue(runtime, multisample);
      } else {
        throw jsi::JSError(runtime,
                           "Missing mandatory prop multisample in multisample");
      }
      if (obj.hasProperty(runtime, "fragment")) {
        auto fragment = obj.getProperty(runtime, "fragment");
        object.fragment = JsiFragmentState::fromValue(runtime, fragment);
      }
    }
  }
};
} // namespace RNSkia
