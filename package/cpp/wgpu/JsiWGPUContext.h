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
    //     JsiRenderPipeline::fromValue(runtime, arguments[1].asObject(runtime));
    auto commandEncoder =
        JsiCommandEncoder::fromValue(runtime, arguments[2].asObject(runtime));
    auto vertexState =
        JsiVertexState::fromValue(runtime, arguments[3].asObject(runtime));
    auto fragState =
        JsiFragmentState::fromValue(runtime, arguments[4].asObject(runtime));

    wgpu::RenderPipelineDescriptor pipelineDesc;

    // Vertex fetch
    // (We don't use any input buffer so far)
    pipelineDesc.vertex = *vertexState.get();

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
    pipelineDesc.fragment = fragState.get();

    // Configure blend state
    wgpu::BlendState blendState;
    // Usual alpha blending for the color:
    blendState.color.srcFactor = wgpu::BlendFactor::SrcAlpha;
    blendState.color.dstFactor = wgpu::BlendFactor::OneMinusSrcAlpha;
    blendState.color.operation = wgpu::BlendOperation::Add;
    // We leave the target alpha untouched:
    blendState.alpha.srcFactor = wgpu::BlendFactor::Zero;
    blendState.alpha.dstFactor = wgpu::BlendFactor::One;
    blendState.alpha.operation = wgpu::BlendOperation::Add;

    auto adapter = device->getAdapter();
    wgpu::TextureFormat swapChainFormat = _surface->getPreferredFormat(adapter);
    wgpu::ColorTargetState colorTarget;
    colorTarget.format = swapChainFormat;
    colorTarget.blend = &blendState;
    colorTarget.writeMask =
        wgpu::ColorWriteMask::All; // We could write to only some
                                   // of the color channels.

    // We have only one target because our render pass has only one output color
    // attachment.

    fragState->targetCount = 1;
    fragState->targets = &colorTarget;

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

    //  while (true) {
    // wgpuInstanceProcessEvents(instance);

    // wgpu::TextureView nextTexture = _swapChain->getCurrentTextureView();
    //  if (!nextTexture) {
    //    RNSkia::RNSkLogger::logToConsole(
    //        "Cannot acquire next swap chain texture");
    //    //return;
    //  }

    // wgpu::CommandEncoderDescriptor commandEncoderDesc;
    // commandEncoderDesc.label = "Command Encoder";
    // wgpu::CommandEncoder encoder =
    // device->createCommandEncoder(commandEncoderDesc);

    // wgpu::RenderPassDescriptor renderPassDesc;

    // wgpu::RenderPassColorAttachment renderPassColorAttachment;
    // renderPassColorAttachment.view = nextTexture;
    // renderPassColorAttachment.resolveTarget = nullptr;
    // renderPassColorAttachment.loadOp = wgpu::LoadOp::Clear;
    // renderPassColorAttachment.storeOp = wgpu::StoreOp::Store;
    // renderPassColorAttachment.depthSlice = UINT32_MAX;
    // renderPassColorAttachment.clearValue = wgpu::Color{0.0, 1.0, 1.0, 1.0};
    // renderPassDesc.colorAttachmentCount = 1;
    // renderPassDesc.colorAttachments = &renderPassColorAttachment;

    // renderPassDesc.depthStencilAttachment = nullptr;
    // renderPassDesc.timestampWriteCount = 0;
    // renderPassDesc.timestampWrites = nullptr;
    // wgpu::RenderPassEncoder renderPass =
    // commandEncoder->beginRenderPass(renderPassDesc);

    // In its overall outline, drawing a triangle is as simple as this:
    // Select which render pipeline to use
    // renderPass.setPipeline(pipeline);
    // // Draw 1 instance of a 3-vertices shape
    // renderPass.draw(3, 1, 0, 0);

    // renderPass.end();
    // renderPass.release();

    // nextTexture.release();

    // wgpu::CommandBufferDescriptor cmdBufferDescriptor;
    // cmdBufferDescriptor.label = "Command buffer";
    // wgpu::CommandBuffer command = encoder.finish(cmdBufferDescriptor);
    // encoder.release();
    // std::vector<WGPUCommandBuffer> commands;
    // commands.push_back(command);
    // wgpu::Queue queue = device->getQueue();
    // queue.submit(command);
    // command.release();

    //_swapChain->present();
    // }

    // pipeline.release();
    // shaderModule.release();
    // _swapChain->release();
    // device.release();
    // adapter.release();
    // instance.release();
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