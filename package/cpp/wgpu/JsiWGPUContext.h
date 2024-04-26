#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiSkHostObjects.h"

#include "JsiDevice.h"
#include "JsiTexture.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiWGPUContext
    : public JsiSkWrappingSharedPtrHostObject<WGPUSurfaceDescriptor> {
private:
  int _width;
  int _height;
  std::shared_ptr<wgpu::SwapChain> _swapChain = nullptr;

public:
  JsiWGPUContext(std::shared_ptr<RNSkPlatformContext> context,
                 std::shared_ptr<WGPUSurfaceDescriptor> m, int width,
                 int height)
      : JsiSkWrappingSharedPtrHostObject<WGPUSurfaceDescriptor>(context,
                                                                std::move(m)),
        _width(width), _height(height) {}

  JSI_HOST_FUNCTION(configure) {
    auto device = JsiDevice::fromValue(
        runtime,
        arguments[0].asObject(runtime).getPropertyAsObject(runtime, "device"));
    auto instance = device->getAdapter().getInstance();
    wgpu::Surface surface =
        wgpuInstanceCreateSurface(instance, getObject().get());
    wgpu::TextureFormat swapChainFormat =
        wgpu::TextureFormat::BGRA8Unorm; // surface.getPreferredFormat(adapter);
                                         // // 	TextureFormat swapChainFormat =
    //                                         // TextureFormat::BGRA8Unorm;
    wgpu::SwapChainDescriptor swapChainDesc;
    swapChainDesc.width = _width;
    swapChainDesc.height = _height;
    swapChainDesc.usage = wgpu::TextureUsage::RenderAttachment;
    swapChainDesc.format = swapChainFormat;
    swapChainDesc.presentMode = wgpu::PresentMode::Fifo;

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

  EXPORT_JSI_API_TYPENAME(JsiWGPUContext, WGPUContext)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiWGPUContext, configure),
                       JSI_EXPORT_FUNC(JsiWGPUContext, getCurrentTexture))
};
} // namespace RNSkia