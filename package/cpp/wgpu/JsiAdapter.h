#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiAdapter : public JsiSkWrappingSharedPtrHostObject<wgpu::Adapter> {
public:
  JsiAdapter(std::shared_ptr<RNSkPlatformContext> context, wgpu::Adapter m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Adapter>(
            context, std::make_shared<wgpu::Adapter>(std::move(m))) {}

  EXPORT_JSI_API_BRANDNAME(JsiAdapter, Adapter)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::Adapter> fromValue(jsi::Runtime &runtime,
                                                  const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiAdapter>(runtime)->getObject();
  }
};
} // namespace RNSkia
