#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiQuerySet.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiRenderPassTimestampWrites
    : public JsiSkWrappingSharedPtrHostObject<wgpu::RenderPassTimestampWrites> {
public:
  JsiRenderPassTimestampWrites(std::shared_ptr<RNSkPlatformContext> context,
                               wgpu::RenderPassTimestampWrites m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::RenderPassTimestampWrites>(
            context,
            std::make_shared<wgpu::RenderPassTimestampWrites>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiRenderPassTimestampWrites,
                          RenderPassTimestampWrites)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::RenderPassTimestampWrites>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiRenderPassTimestampWrites>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
