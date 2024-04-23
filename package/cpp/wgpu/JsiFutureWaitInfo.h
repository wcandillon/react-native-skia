#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiFuture.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiFutureWaitInfo
    : public JsiSkWrappingSharedPtrHostObject<wgpu::FutureWaitInfo> {
public:
  JsiFutureWaitInfo(std::shared_ptr<RNSkPlatformContext> context,
                    wgpu::FutureWaitInfo m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::FutureWaitInfo>(
            context, std::make_shared<wgpu::FutureWaitInfo>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiFutureWaitInfo, FutureWaitInfo)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::FutureWaitInfo>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiFutureWaitInfo>(runtime)->getObject();
  }
};
} // namespace RNSkia
