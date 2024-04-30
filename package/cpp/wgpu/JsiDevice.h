#pragma once
#include <memory>
#include <string>
#include <utility>

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiBindGroup.h"
#include "JsiBindGroupDescriptor.h"
#include "JsiBuffer.h"
#include "JsiBufferDescriptor.h"
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
#include "JsiTexture.h"
#include "JsiTextureDescriptor.h"
#include "RNSkLog.h"
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

  JSI_HOST_FUNCTION(createBindGroup) {
    auto descriptor = JsiBindGroupDescriptor::fromValue(runtime, arguments[0]);

    auto ret = getObject()->createBindGroup(*descriptor);
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiBindGroup>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createRenderPipeline) {
    auto descriptor =
        JsiRenderPipelineDescriptor::fromValue(runtime, arguments[0]);

    auto ret = getObject()->createRenderPipeline(*descriptor);
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiRenderPipeline>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createShaderModule) {
    auto moduleDescriptor =
        JsiShaderModuleWGSLDescriptor::fromValue(runtime, arguments[0]);

    auto moduleDescriptorNext = *moduleDescriptor;
    wgpu::ShaderModuleDescriptor baseModuleDescriptor;
    baseModuleDescriptor.nextInChain = &moduleDescriptorNext.chain;
    auto ret = getObject()->createShaderModule(baseModuleDescriptor);
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiShaderModule>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createCommandEncoder) {
    auto defaultDescriptor = new wgpu::CommandEncoderDescriptor();
    auto descriptor =
        count > 0
            ? JsiCommandEncoderDescriptor::fromValue(runtime, arguments[0])
            : defaultDescriptor;

    auto ret = getObject()->createCommandEncoder(*descriptor);
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiCommandEncoder>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createBuffer) {
    auto descritor = JsiBufferDescriptor::fromValue(runtime, arguments[0]);

    auto ret = getObject()->createBuffer(*descritor);
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiBuffer>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createTexture) {
    auto descriptor = JsiTextureDescriptor::fromValue(runtime, arguments[0]);

    auto ret = getObject()->createTexture(*descriptor);
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiTexture>(getContext(), ret));
  }

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead

  JSI_EXPORT_PROPERTY_GETTERS(JSI_EXPORT_PROP_GET(JsiDevice, queue))

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiDevice, createBindGroup),
                       JSI_EXPORT_FUNC(JsiDevice, createRenderPipeline),
                       JSI_EXPORT_FUNC(JsiDevice, createShaderModule),
                       JSI_EXPORT_FUNC(JsiDevice, createCommandEncoder),
                       JSI_EXPORT_FUNC(JsiDevice, createBuffer),
                       JSI_EXPORT_FUNC(JsiDevice, createTexture))

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::Device *fromValue(jsi::Runtime &runtime, const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiDevice>(runtime)->getObject().get();
    } else {
      throw jsi::JSError(runtime, "Expected a JsiDevice object, but got a " +
                                      raw.toString(runtime).utf8(runtime));
    }
  }
};
} // namespace RNSkia
