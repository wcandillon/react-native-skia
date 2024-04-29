#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiSkHostObjects.h"

#include "JsiDevice.h"
#include "JsiTexture.h"
#include "RNSkLog.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiWGPUContext : public JsiSkWrappingSharedPtrHostObject<wgpu::Surface> {
private:
  int _width;
  int _height;
  std::shared_ptr<wgpu::SwapChain> _swapChain = nullptr;
  std::shared_ptr<wgpu::Surface> _surface = nullptr;

public:
  JsiWGPUContext(std::shared_ptr<RNSkPlatformContext> context,
                 std::shared_ptr<wgpu::Surface> m, int width, int height)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Surface>(context, std::move(m)),
        _width(width), _height(height) {}

  JSI_HOST_FUNCTION(configure) {
    auto device = JsiDevice::fromValue(
        runtime,
        arguments[0].asObject(runtime).getPropertyAsObject(runtime, "device"));
    auto adapter = device->getAdapter();
    wgpu::Surface surface = *getObject().get();
    wgpu::SwapChainDescriptor swapChainDesc;
    swapChainDesc.width = _width;
    swapChainDesc.height = _height;
    swapChainDesc.usage = wgpu::TextureUsage::RenderAttachment;
    swapChainDesc.format = surface.getPreferredFormat(adapter);
    swapChainDesc.presentMode = wgpu::PresentMode::Fifo;
    _surface = std::make_shared<wgpu::Surface>(surface);
    _swapChain = std::make_shared<wgpu::SwapChain>(
        device->createSwapChain(surface, swapChainDesc));
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(getCurrentTexture) {
    if (!_swapChain) {
      throw jsi::JSError(runtime, "WGPU Context is not configured");
    }
    wgpu::Texture texture = _swapChain->getCurrentTexture();
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiTexture>(getContext(), texture));
  }

  JSI_HOST_FUNCTION(present) {
    if (!_swapChain) {
      throw jsi::JSError(runtime, "WGPU Context is not configured");
    }
    _swapChain->present();
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(runDemo) {
    auto device = JsiDevice::fromValue(runtime, arguments[0].asObject(runtime));
    // auto pipeline2 =
    //     JsiRenderPipeline::fromValue(runtime,
    //     arguments[1].asObject(runtime));
    auto commandEncoder =
        JsiCommandEncoder::fromValue(runtime, arguments[2].asObject(runtime));
    auto vertexState =
        JsiVertexState::fromValue(runtime, arguments[3].asObject(runtime));
    auto fragState =
        JsiFragmentState::fromValue(runtime, arguments[4].asObject(runtime));

    wgpu::RenderPipelineDescriptor pipelineDesc;

    // Vertex fetch
    // (We don't use any input buffer so far)
    pipelineDesc.vertex = *vertexState;

    // Primitive assembly and rasterization
    // Each sequence of 3 vertices is considered as a triangle
    pipelineDesc.primitive.topology = wgpu::PrimitiveTopology::TriangleList;
    // We'll see later how to specify the order in which vertices should be
    // connected. When not specified, vertices are considered sequentially.
    pipelineDesc.primitive.stripIndexFormat = wgpu::IndexFormat::Undefined;
    // The face orientation is defined by assuming that when looking
    // from the front of the face, its corner vertices are enumerated
    // in the counter-clockwise (CCW) order.
    pipelineDesc.primitive.frontFace = wgpu::FrontFace::CCW;
    // But the face orientation does not matter much because we do not
    // cull (i.e. "hide") the faces pointing away from us (which is often
    // used for optimization).
    pipelineDesc.primitive.cullMode = wgpu::CullMode::None;

    // Fragment shader
    pipelineDesc.fragment = fragState;

    //    wgpu::ColorTargetState colorTarget;
    //    colorTarget.format = fragState->targets[0].format;
    //    colorTarget.writeMask = fragState->targets[0].writeMask;
    //    fragState->targetCount = 1;
    //    fragState->targets = &colorTarget;

    // Depth and stencil tests are not used here
    pipelineDesc.depthStencil = nullptr;

    // Multi-sampling
    // Samples per pixel
    pipelineDesc.multisample.count = 1;
    // Default value for the mask, meaning "all bits on"
    pipelineDesc.multisample.mask = ~0u;
    // Default value as well (irrelevant for count = 1 anyways)
    pipelineDesc.multisample.alphaToCoverageEnabled = false;

    // Pipeline layout
    pipelineDesc.layout = nullptr;

    wgpu::RenderPipeline pipeline = device->createRenderPipeline(pipelineDesc);
    std::cout << "Render pipeline: " << pipeline << std::endl;

    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiRenderPipeline>(getContext(), pipeline));
  }

  EXPORT_JSI_API_TYPENAME(JsiWGPUContext, WGPUContext)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiWGPUContext, configure),
                       JSI_EXPORT_FUNC(JsiWGPUContext, getCurrentTexture),
                       JSI_EXPORT_FUNC(JsiWGPUContext, present),
                       JSI_EXPORT_FUNC(JsiWGPUContext, runDemo))
};
} // namespace RNSkia