#pragma once
#include <memory>
#include <string>
#include <utility>

#include "dawn/webgpu_cpp.h"

#include <jsi/jsi.h>

#include "JsiBindGroup.h"
#include "JsiBindGroupDescriptor.h"
#include "JsiBuffer.h"
#include "JsiBufferDescriptor.h"
#include "JsiCommandEncoder.h"
#include "JsiCommandEncoderDescriptor.h"
#include "JsiComputePipeline.h"
#include "JsiComputePipelineDescriptor.h"
#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPipelineLayoutDescriptor.h"
#include "JsiPromises.h"
#include "JsiQueue.h"
#include "JsiRenderPipeline.h"
#include "JsiRenderPipelineDescriptor.h"
#include "JsiSampler.h"
#include "JsiSamplerDescriptor.h"
#include "JsiShaderModule.h"
#include "JsiShaderModuleWGSLDescriptor.h"
#include "JsiSkHostObjects.h"
#include "JsiTexture.h"
#include "JsiTextureDescriptor.h"
#include "JsiTextureView.h"
#include "MutableJSIBuffer.h"
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

    auto ret = getObject()->GetQueue();
    if (ret == nullptr) {
      throw jsi::JSError(runtime, "getQueue returned null");
    }
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiQueue>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createPipelineLayout) {
    auto descriptor =
        JsiPipelineLayoutDescriptor::fromValue(runtime, arguments[0]);

    getObject()->CreatePipelineLayout(descriptor);

    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(createSampler) {
    auto descriptor = JsiSamplerDescriptor::fromValue(runtime, arguments[0]);

    auto ret = getObject()->CreateSampler(descriptor);
    if (ret == nullptr) {
      throw jsi::JSError(runtime, "createSampler returned null");
    }
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiSampler>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createBindGroup) {
    auto descriptor = JsiBindGroupDescriptor::fromValue(runtime, arguments[0]);

    auto ret = getObject()->CreateBindGroup(descriptor);
    if (ret == nullptr) {
      throw jsi::JSError(runtime, "createBindGroup returned null");
    }
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiBindGroup>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createRenderPipeline) {
    auto descriptor =
        JsiRenderPipelineDescriptor::fromValue(runtime, arguments[0]);

    auto ret = getObject()->CreateRenderPipeline(descriptor);
    if (ret == nullptr) {
      throw jsi::JSError(runtime, "createRenderPipeline returned null");
    }
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiRenderPipeline>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createComputePipeline) {
    auto descriptor =
        JsiComputePipelineDescriptor::fromValue(runtime, arguments[0]);

    auto ret = getObject()->CreateComputePipeline(descriptor);
    if (ret == nullptr) {
      throw jsi::JSError(runtime, "createComputePipeline returned null");
    }
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiComputePipeline>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createShaderModule) {
    auto moduleDescriptor =
        JsiShaderModuleWGSLDescriptor::fromValue(runtime, arguments[0]);

    auto moduleDescriptorNext = *moduleDescriptor;
    auto baseModuleDescriptor = new wgpu::ShaderModuleDescriptor();
    baseModuleDescriptor->nextInChain = &moduleDescriptorNext;
    auto ret = getObject()->CreateShaderModule(baseModuleDescriptor);
    if (ret == nullptr) {
      throw jsi::JSError(runtime, "createShaderModule returned null");
    }
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiShaderModule>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createCommandEncoder) {
    auto defaultDescriptor = new wgpu::CommandEncoderDescriptor();
    auto descriptor =
        count > 0
            ? JsiCommandEncoderDescriptor::fromValue(runtime, arguments[0])
            : defaultDescriptor;

    auto ret = getObject()->CreateCommandEncoder(descriptor);
    if (ret == nullptr) {
      throw jsi::JSError(runtime, "createCommandEncoder returned null");
    }
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiCommandEncoder>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createBuffer) {
    auto descritor = JsiBufferDescriptor::fromValue(runtime, arguments[0]);

    auto ret = getObject()->CreateBuffer(descritor);
    if (ret == nullptr) {
      throw jsi::JSError(runtime, "createBuffer returned null");
    }
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiBuffer>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createTexture) {
    auto descriptor = JsiTextureDescriptor::fromValue(runtime, arguments[0]);

    auto ret = getObject()->CreateTexture(descriptor);
    if (ret == nullptr) {
      throw jsi::JSError(runtime, "createTexture returned null");
    }
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiTexture>(getContext(), ret));
  }

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead

  JSI_EXPORT_PROPERTY_GETTERS(JSI_EXPORT_PROP_GET(JsiDevice, queue))

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiDevice, createPipelineLayout),
                       JSI_EXPORT_FUNC(JsiDevice, createSampler),
                       JSI_EXPORT_FUNC(JsiDevice, createBindGroup),
                       JSI_EXPORT_FUNC(JsiDevice, createRenderPipeline),
                       JSI_EXPORT_FUNC(JsiDevice, createComputePipeline),
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
