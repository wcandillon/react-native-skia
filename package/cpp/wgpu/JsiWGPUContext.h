#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiSkHostObjects.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiWGPUContext
    : public JsiSkWrappingSharedPtrHostObject<wgpu::SwapChain> {
public:
  JsiWGPUContext(std::shared_ptr<RNSkPlatformContext> context,
                 wgpu::SwapChain m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::SwapChain>(
            context, std::make_shared<wgpu::SwapChain>(std::move(m))) {}

};
}// namespace RNSkia