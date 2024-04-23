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
      if (o.hasProperty(runtime, "label")) {
        auto label = o.getProperty(runtime, "label");
        object.label = label;
      }
      if (o.hasProperty(runtime, "layout")) {
        auto layout = o.getProperty(runtime, "layout");
        object.layout = layout;
      }
      if (o.hasProperty(runtime, "vertex")) {
        auto vertex = o.getProperty(runtime, "vertex");
        object.vertex = vertex;
      } else {
        throw jsi::JSError(runtime, "Missing mandatory prop vertex in vertex");
      }
      if (o.hasProperty(runtime, "primitive")) {
        auto primitive = o.getProperty(runtime, "primitive");
        object.primitive = primitive;
      } else {
        throw jsi::JSError(runtime,
                           "Missing mandatory prop primitive in primitive");
      }
      if (o.hasProperty(runtime, "depth stencil")) {
        auto depthStencil = o.getProperty(runtime, "depth stencil");
        object.depthStencil = depthStencil;
      }
      if (o.hasProperty(runtime, "multisample")) {
        auto multisample = o.getProperty(runtime, "multisample");
        object.multisample = multisample;
      } else {
        throw jsi::JSError(runtime,
                           "Missing mandatory prop multisample in multisample");
      }
      if (o.hasProperty(runtime, "fragment")) {
        auto fragment = o.getProperty(runtime, "fragment");
        object.fragment = fragment;
      }
    }
  }
};
} // namespace RNSkia
