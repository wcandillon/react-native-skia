#pragma once
#include <memory>
#include <string>
#include <utility>

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiDepthStencilState.h"
#include "JsiEnums.h"
#include "JsiFragmentState.h"
#include "JsiHostObject.h"
#include "JsiPrimitiveState.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "JsiVertexState.h"
#include "RNSkPlatformContext.h"

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
      auto object = std::make_shared<wgpu::RenderPipelineDescriptor>();
      if (obj.hasProperty(runtime, "vertex")) {
        auto vertex = obj.getProperty(runtime, "vertex");
        object->vertex = *JsiVertexState::fromValue(runtime, vertex).get();
      } else {
        throw jsi::JSError(
            runtime,
            "Missing mandatory prop vertex in RenderPipelineDescriptor");
      }
      if (obj.hasProperty(runtime, "primitive")) {
        auto primitive = obj.getProperty(runtime, "primitive");
        object->primitive =
            *JsiPrimitiveState::fromValue(runtime, primitive).get();
      } else {
        throw jsi::JSError(
            runtime,
            "Missing mandatory prop primitive in RenderPipelineDescriptor");
      }
      if (obj.hasProperty(runtime, "depthStencil")) {
        auto depthStencil = obj.getProperty(runtime, "depthStencil");
        object->depthStencil =
            JsiDepthStencilState::fromValue(runtime, depthStencil).get();
      }
      if (obj.hasProperty(runtime, "fragment")) {
        auto fragment = obj.getProperty(runtime, "fragment");
        object->fragment = JsiFragmentState::fromValue(runtime, fragment).get();
      }
      return object;
    }
  }
};
} // namespace RNSkia
