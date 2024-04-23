#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiBufferMapCallbackInfo
    : public JsiSkWrappingSharedPtrHostObject<wgpu::BufferMapCallbackInfo> {
public:
  JsiBufferMapCallbackInfo(std::shared_ptr<RNSkPlatformContext> context,
                           wgpu::BufferMapCallbackInfo m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::BufferMapCallbackInfo>(
            context,
            std::make_shared<wgpu::BufferMapCallbackInfo>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiBufferMapCallbackInfo, BufferMapCallbackInfo)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::BufferMapCallbackInfo>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiBufferMapCallbackInfo>(runtime)->getObject();
  }
};
} // namespace RNSkia
