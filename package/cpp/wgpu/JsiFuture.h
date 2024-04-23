#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiFuture : public JsiSkWrappingSharedPtrHostObject<wgpu::Future> {
public:
  JsiFuture(std::shared_ptr<RNSkPlatformContext> context, wgpu::Future m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Future>(
            context, std::make_shared<wgpu::Future>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiFuture, Future)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::Future> fromValue(jsi::Runtime &runtime,
                                                 const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiFuture>(runtime)->getObject();
  }
};
} // namespace RNSkia
