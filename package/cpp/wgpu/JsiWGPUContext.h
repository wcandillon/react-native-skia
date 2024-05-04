#pragma once

#include "dawn/webgpu_cpp.h"

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
    auto adapter = device->GetAdapter();
    wgpu::Surface surface = *getObject().get();
    wgpu::SwapChainDescriptor swapChainDesc;
    swapChainDesc.width = _width;
    swapChainDesc.height = _height;
    swapChainDesc.usage = wgpu::TextureUsage::RenderAttachment;
    swapChainDesc.format =
        wgpu::TextureFormat::RGBA8Unorm; // surface.GetPreferredFormat(adapter);
    swapChainDesc.presentMode = wgpu::PresentMode::Fifo;
    // swapChainDesc.compositingAlphaMode =
    // wgpu::CompositingAlphaMode::PreMultiplied;
    _surface = std::make_shared<wgpu::Surface>(surface);
    _swapChain = std::make_shared<wgpu::SwapChain>(
        device->CreateSwapChain(surface, &swapChainDesc));
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(getCurrentTexture) {
    if (!_swapChain) {
      throw jsi::JSError(runtime, "WGPU Context is not configured");
    }
    wgpu::Texture texture = _swapChain->GetCurrentTexture();
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiTexture>(getContext(), texture));
  }

  JSI_HOST_FUNCTION(present) {
    if (!_swapChain) {
      throw jsi::JSError(runtime, "WGPU Context is not configured");
    }
    _swapChain->Present();
    return jsi::Value::undefined();
  }

  EXPORT_JSI_API_TYPENAME(JsiWGPUContext, WGPUContext)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiWGPUContext, configure),
                       JSI_EXPORT_FUNC(JsiWGPUContext, getCurrentTexture),
                       JSI_EXPORT_FUNC(JsiWGPUContext, present))
};
} // namespace RNSkia