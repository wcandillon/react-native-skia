#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
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
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    if (obj.isHostObject(runtime)) {
      return obj.asObject(runtime)
          .asHostObject<JsiRenderPipelineDescriptor>(runtime)
          ->getObject();
    } else {
      wgpu::RenderPipelineDescriptor object;
      const auto &o = obj.asObject(runtime);

      auto label = o.getProperty(runtime, "label");
      object.label = label;

      auto layout = o.getProperty(runtime, "layout");
      object.layout = layout;

      auto vertex = o.getProperty(runtime, "vertex");
      object.vertex = vertex;

      auto primitive = o.getProperty(runtime, "primitive");
      object.primitive = primitive;

      auto depthStencil = o.getProperty(runtime, "depth stencil");
      object.depthStencil = depthStencil;

      auto multisample = o.getProperty(runtime, "multisample");
      object.multisample = multisample;

      auto fragment = o.getProperty(runtime, "fragment");
      object.fragment = fragment;
    }
  }
};
} // namespace RNSkia
