#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiRequestAdapterCallbackInfo : public JsiSkWrappingSharedPtrHostObject<
                                          wgpu::RequestAdapterCallbackInfo> {
public:
  JsiRequestAdapterCallbackInfo(std::shared_ptr<RNSkPlatformContext> context,
                                wgpu::RequestAdapterCallbackInfo m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::RequestAdapterCallbackInfo>(
            context,
            std::make_shared<wgpu::RequestAdapterCallbackInfo>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiRequestAdapterCallbackInfo,
                          RequestAdapterCallbackInfo)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::RequestAdapterCallbackInfo>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiRequestAdapterCallbackInfo>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
