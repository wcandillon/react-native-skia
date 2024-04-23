#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiQueueWorkDoneCallbackInfo
    : public JsiSkWrappingSharedPtrHostObject<wgpu::QueueWorkDoneCallbackInfo> {
public:
  JsiQueueWorkDoneCallbackInfo(std::shared_ptr<RNSkPlatformContext> context,
                               wgpu::QueueWorkDoneCallbackInfo m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::QueueWorkDoneCallbackInfo>(
            context,
            std::make_shared<wgpu::QueueWorkDoneCallbackInfo>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiQueueWorkDoneCallbackInfo,
                          QueueWorkDoneCallbackInfo)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::QueueWorkDoneCallbackInfo>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiQueueWorkDoneCallbackInfo>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
