#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiAdapter.h"
#include "JsiBindGroup.h"
#include "JsiBindGroupDescriptor.h"
#include "JsiBindGroupLayout.h"
#include "JsiBindGroupLayoutDescriptor.h"
#include "JsiBuffer.h"
#include "JsiBufferDescriptor.h"
#include "JsiCommandEncoder.h"
#include "JsiCommandEncoderDescriptor.h"
#include "JsiComputePipeline.h"
#include "JsiComputePipelineDescriptor.h"
#include "JsiExternalTexture.h"
#include "JsiExternalTextureDescriptor.h"
#include "JsiPipelineLayout.h"
#include "JsiPipelineLayoutDescriptor.h"
#include "JsiQuerySet.h"
#include "JsiQuerySetDescriptor.h"
#include "JsiQueue.h"
#include "JsiRenderBundleEncoder.h"
#include "JsiRenderBundleEncoderDescriptor.h"
#include "JsiRenderPipeline.h"
#include "JsiRenderPipelineDescriptor.h"
#include "JsiSampler.h"
#include "JsiSamplerDescriptor.h"
#include "JsiShaderModule.h"
#include "JsiShaderModuleDescriptor.h"
#include "JsiSharedFence.h"
#include "JsiSharedFenceDescriptor.h"
#include "JsiSharedTextureMemory.h"
#include "JsiSharedTextureMemoryDescriptor.h"
#include "JsiSupportedLimits.h"
#include "JsiSurface.h"
#include "JsiSwapChain.h"
#include "JsiSwapChainDescriptor.h"
#include "JsiTexture.h"
#include "JsiTextureDescriptor.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiDevice : public JsiSkWrappingSharedPtrHostObject<wgpu::Device> {
public:
  JsiDevice(std::shared_ptr<RNSkPlatformContext> context, wgpu::Device m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Device>(
            context, std::make_shared<wgpu::Device>(std::move(m))) {}

  JSI_HOST_FUNCTION(createBindGroup) {
    auto descriptor = JsiBindGroupDescriptor::fromValue(runtime, arguments[0]);
    auto ret = getObject()->createBindGroup(*descriptor.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiBindGroup>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createBindGroupLayout) {
    auto descriptor =
        JsiBindGroupLayoutDescriptor::fromValue(runtime, arguments[0]);
    auto ret = getObject()->createBindGroupLayout(*descriptor.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiBindGroupLayout>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createBuffer) {
    auto descriptor = JsiBufferDescriptor::fromValue(runtime, arguments[0]);
    auto ret = getObject()->createBuffer(*descriptor.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiBuffer>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createErrorBuffer) {
    auto descriptor = JsiBufferDescriptor::fromValue(runtime, arguments[0]);
    auto ret = getObject()->createErrorBuffer(*descriptor.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiBuffer>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createCommandEncoder) {
    auto descriptor =
        count > 0
            ? JsiCommandEncoderDescriptor::fromValue(runtime, arguments[0])
            : defaultDescriptor;
    auto ret = getObject()->createCommandEncoder(*descriptor.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiCommandEncoder>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createComputePipeline) {
    auto descriptor =
        JsiComputePipelineDescriptor::fromValue(runtime, arguments[0]);
    auto ret = getObject()->createComputePipeline(*descriptor.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiComputePipeline>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createComputePipelineAsync) {
    auto descriptor =
        JsiComputePipelineDescriptor::fromValue(runtime, arguments[0]);
    auto callback =
        JsiCreateComputePipelineAsyncCallback::fromValue(runtime, arguments[1]);
    auto userdata = JsiVoid::fromValue(runtime, arguments[2]);
    auto ret = getObject()->createComputePipelineAsync(
        *descriptor.get(), *callback.get(), *userdata.get());
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(createExternalTexture) {
    auto externalTextureDescriptor =
        JsiExternalTextureDescriptor::fromValue(runtime, arguments[0]);
    auto ret =
        getObject()->createExternalTexture(*external texture descriptor.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiExternalTexture>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createErrorExternalTexture) {

    auto ret = getObject()->createErrorExternalTexture();
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiExternalTexture>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createPipelineLayout) {
    auto descriptor =
        JsiPipelineLayoutDescriptor::fromValue(runtime, arguments[0]);
    auto ret = getObject()->createPipelineLayout(*descriptor.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiPipelineLayout>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createQuerySet) {
    auto descriptor = JsiQuerySetDescriptor::fromValue(runtime, arguments[0]);
    auto ret = getObject()->createQuerySet(*descriptor.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiQuerySet>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createRenderPipelineAsync) {
    auto descriptor =
        JsiRenderPipelineDescriptor::fromValue(runtime, arguments[0]);
    auto callback =
        JsiCreateRenderPipelineAsyncCallback::fromValue(runtime, arguments[1]);
    auto userdata = JsiVoid::fromValue(runtime, arguments[2]);
    auto ret = getObject()->createRenderPipelineAsync(
        *descriptor.get(), *callback.get(), *userdata.get());
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(createRenderBundleEncoder) {
    auto descriptor =
        JsiRenderBundleEncoderDescriptor::fromValue(runtime, arguments[0]);
    auto ret = getObject()->createRenderBundleEncoder(*descriptor.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiRenderBundleEncoder>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createRenderPipeline) {
    auto descriptor =
        JsiRenderPipelineDescriptor::fromValue(runtime, arguments[0]);
    auto ret = getObject()->createRenderPipeline(*descriptor.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiRenderPipeline>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createSampler) {
    auto descriptor =
        count > 0 ? JsiSamplerDescriptor::fromValue(runtime, arguments[0])
                  : defaultDescriptor;
    auto ret = getObject()->createSampler(*descriptor.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiSampler>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createShaderModule) {
    auto descriptor =
        JsiShaderModuleDescriptor::fromValue(runtime, arguments[0]);
    auto ret = getObject()->createShaderModule(*descriptor.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiShaderModule>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createErrorShaderModule) {
    auto descriptor =
        JsiShaderModuleDescriptor::fromValue(runtime, arguments[0]);
    auto errorMessage = JsiChar::fromValue(runtime, arguments[1]);
    auto ret = getObject()->createErrorShaderModule(*descriptor.get(),
                                                    *error message.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiShaderModule>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createSwapChain) {
    auto surface = JsiSurface::fromValue(runtime, arguments[0]);
    auto descriptor = JsiSwapChainDescriptor::fromValue(runtime, arguments[1]);
    auto ret = getObject()->createSwapChain(*surface.get(), *descriptor.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiSwapChain>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createTexture) {
    auto descriptor = JsiTextureDescriptor::fromValue(runtime, arguments[0]);
    auto ret = getObject()->createTexture(*descriptor.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiTexture>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(importSharedTextureMemory) {
    auto descriptor =
        JsiSharedTextureMemoryDescriptor::fromValue(runtime, arguments[0]);
    auto ret = getObject()->importSharedTextureMemory(*descriptor.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiSharedTextureMemory>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(importSharedFence) {
    auto descriptor =
        JsiSharedFenceDescriptor::fromValue(runtime, arguments[0]);
    auto ret = getObject()->importSharedFence(*descriptor.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiSharedFence>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(createErrorTexture) {
    auto descriptor = JsiTextureDescriptor::fromValue(runtime, arguments[0]);
    auto ret = getObject()->createErrorTexture(*descriptor.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiTexture>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(destroy) {

    getObject()->destroy();
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(getLimits) {
    auto limits = JsiSupportedLimits::fromValue(runtime, arguments[0]);
    auto ret = getObject()->getLimits(*limits.get());
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(hasFeature) {
    auto feature = JsiFeatureName::fromValue(runtime, arguments[0]);
    auto ret = getObject()->hasFeature(*feature.get());
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(enumerateFeatures) {
    auto features = JsiFeatureName::fromValue(runtime, arguments[0]);
    auto ret = getObject()->enumerateFeatures(*features.get());
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(getAdapter) {

    auto ret = getObject()->getAdapter();
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiAdapter>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(getQueue) {

    auto ret = getObject()->getQueue();
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiQueue>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(injectError) {
    auto type = JsiErrorType::fromValue(runtime, arguments[0]);
    auto message = JsiChar::fromValue(runtime, arguments[1]);
    getObject()->injectError(*type.get(), *message.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(forceLoss) {
    auto type = JsiDeviceLostReason::fromValue(runtime, arguments[0]);
    auto message = JsiChar::fromValue(runtime, arguments[1]);
    getObject()->forceLoss(*type.get(), *message.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(tick) {

    getObject()->tick();
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(setUncapturedErrorCallback) {
    auto callback = JsiErrorCallback::fromValue(runtime, arguments[0]);
    auto userdata = JsiVoid::fromValue(runtime, arguments[1]);
    getObject()->setUncapturedErrorCallback(*callback.get(), *userdata.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(setLoggingCallback) {
    auto callback = JsiLoggingCallback::fromValue(runtime, arguments[0]);
    auto userdata = JsiVoid::fromValue(runtime, arguments[1]);
    getObject()->setLoggingCallback(*callback.get(), *userdata.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(setDeviceLostCallback) {
    auto callback = JsiDeviceLostCallback::fromValue(runtime, arguments[0]);
    auto userdata = JsiVoid::fromValue(runtime, arguments[1]);
    getObject()->setDeviceLostCallback(*callback.get(), *userdata.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(pushErrorScope) {
    auto filter = JsiErrorFilter::fromValue(runtime, arguments[0]);
    getObject()->pushErrorScope(*filter.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(popErrorScope) {
    auto callback = JsiErrorCallback::fromValue(runtime, arguments[0]);
    auto userdata = JsiVoid::fromValue(runtime, arguments[1]);
    getObject()->popErrorScope(*callback.get(), *userdata.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(setLabel) {
    auto label = JsiChar::fromValue(runtime, arguments[0]);
    auto ret = getObject()->setLabel(*label.get());
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(validateTextureDescriptor) {
    auto descriptor = JsiTextureDescriptor::fromValue(runtime, arguments[0]);
    getObject()->validateTextureDescriptor(*descriptor.get());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(getSupportedSurfaceUsage) {
    auto surface = JsiSurface::fromValue(runtime, arguments[0]);
    auto ret = getObject()->getSupportedSurfaceUsage(*surface.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiTextureUsage>(getContext(), ret));
  }

  EXPORT_JSI_API_TYPENAME(JsiDevice, Device)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiDevice, createBindGroup),
                       JSI_EXPORT_FUNC(JsiDevice, createBindGroupLayout),
                       JSI_EXPORT_FUNC(JsiDevice, createBuffer),
                       JSI_EXPORT_FUNC(JsiDevice, createErrorBuffer),
                       JSI_EXPORT_FUNC(JsiDevice, createCommandEncoder),
                       JSI_EXPORT_FUNC(JsiDevice, createComputePipeline),
                       JSI_EXPORT_FUNC(JsiDevice, createComputePipelineAsync),
                       JSI_EXPORT_FUNC(JsiDevice, createExternalTexture),
                       JSI_EXPORT_FUNC(JsiDevice, createErrorExternalTexture),
                       JSI_EXPORT_FUNC(JsiDevice, createPipelineLayout),
                       JSI_EXPORT_FUNC(JsiDevice, createQuerySet),
                       JSI_EXPORT_FUNC(JsiDevice, createRenderPipelineAsync),
                       JSI_EXPORT_FUNC(JsiDevice, createRenderBundleEncoder),
                       JSI_EXPORT_FUNC(JsiDevice, createRenderPipeline),
                       JSI_EXPORT_FUNC(JsiDevice, createSampler),
                       JSI_EXPORT_FUNC(JsiDevice, createShaderModule),
                       JSI_EXPORT_FUNC(JsiDevice, createErrorShaderModule),
                       JSI_EXPORT_FUNC(JsiDevice, createSwapChain),
                       JSI_EXPORT_FUNC(JsiDevice, createTexture),
                       JSI_EXPORT_FUNC(JsiDevice, importSharedTextureMemory),
                       JSI_EXPORT_FUNC(JsiDevice, importSharedFence),
                       JSI_EXPORT_FUNC(JsiDevice, createErrorTexture),
                       JSI_EXPORT_FUNC(JsiDevice, destroy),
                       JSI_EXPORT_FUNC(JsiDevice, getLimits),
                       JSI_EXPORT_FUNC(JsiDevice, hasFeature),
                       JSI_EXPORT_FUNC(JsiDevice, enumerateFeatures),
                       JSI_EXPORT_FUNC(JsiDevice, getAdapter),
                       JSI_EXPORT_FUNC(JsiDevice, getQueue),
                       JSI_EXPORT_FUNC(JsiDevice, injectError),
                       JSI_EXPORT_FUNC(JsiDevice, forceLoss),
                       JSI_EXPORT_FUNC(JsiDevice, tick),
                       JSI_EXPORT_FUNC(JsiDevice, setUncapturedErrorCallback),
                       JSI_EXPORT_FUNC(JsiDevice, setLoggingCallback),
                       JSI_EXPORT_FUNC(JsiDevice, setDeviceLostCallback),
                       JSI_EXPORT_FUNC(JsiDevice, pushErrorScope),
                       JSI_EXPORT_FUNC(JsiDevice, popErrorScope),
                       JSI_EXPORT_FUNC(JsiDevice, setLabel),
                       JSI_EXPORT_FUNC(JsiDevice, validateTextureDescriptor),
                       JSI_EXPORT_FUNC(JsiDevice, getSupportedSurfaceUsage))

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::Device> fromValue(jsi::Runtime &runtime,
                                                 const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiDevice>(runtime)->getObject();
  }
};
} // namespace RNSkia
