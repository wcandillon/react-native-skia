#pragma once
#include <memory>
#include <string>
#include <utility>

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiCommandEncoder.h"
#include "JsiCommandEncoderDescriptor.h"
#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiQueue.h"
#include "JsiRenderPipeline.h"
#include "JsiRenderPipelineDescriptor.h"
#include "JsiShaderModule.h"
#include "JsiShaderModuleWGSLDescriptor.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiDevice : public JsiSkWrappingSharedPtrHostObject<wgpu::Device> {
public:
  JsiDevice(std::shared_ptr<RNSkPlatformContext> context, wgpu::Device m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Device>(
            context, std::make_shared<wgpu::Device>(std::move(m))) {}

  JSI_PROPERTY_GET(queue) {
    auto ret = getObject()->getQueue();
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiQueue>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createRenderPipeline) {
    auto descriptor =
        JsiRenderPipelineDescriptor::fromValue(runtime, arguments[0]);

    auto ret = getObject()->createRenderPipeline(*descriptor.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiRenderPipeline>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createShaderModule) {
    auto moduleDescriptor =
        JsiShaderModuleWGSLDescriptor::fromValue(runtime, arguments[0]);

    auto moduleDescriptorNext = *moduleDescriptor.get();
    wgpu::ShaderModuleDescriptor baseModuleDescriptor;
    baseModuleDescriptor.nextInChain = &moduleDescriptorNext.chain;
    auto ret = getObject()->createShaderModule(baseModuleDescriptor);
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiShaderModule>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createCommandEncoder) {
    auto defaultDescriptor = std::make_shared<wgpu::CommandEncoderDescriptor>();
    auto descriptor =
        count > 0
            ? JsiCommandEncoderDescriptor::fromValue(runtime, arguments[0])
            : defaultDescriptor;

    auto ret = getObject()->createCommandEncoder(*descriptor.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiCommandEncoder>(getContext(), ret));
  }

  EXPORT_JSI_API_BRANDNAME(JsiDevice, Device)

  JSI_EXPORT_PROPERTY_GETTERS(JSI_EXPORT_PROP_GET(JsiDevice, queue))

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiDevice, createRenderPipeline),
                       JSI_EXPORT_FUNC(JsiDevice, createShaderModule),
                       JSI_EXPORT_FUNC(JsiDevice, createCommandEncoder))

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::Device> fromValue(jsi::Runtime &runtime,
                                                 const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiDevice>(runtime)->getObject();
    } else {
      throw jsi::JSError(runtime, "Expected a JsiDevice object, but got a " +
                                      raw.toString(runtime).utf8(runtime));
    }
  }
};
} // namespace RNSkia
