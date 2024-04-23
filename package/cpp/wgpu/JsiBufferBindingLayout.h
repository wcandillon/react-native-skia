#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiBufferBindingLayout
    : public JsiSkWrappingSharedPtrHostObject<wgpu::BufferBindingLayout> {
public:
  JsiBufferBindingLayout(std::shared_ptr<RNSkPlatformContext> context,
                         wgpu::BufferBindingLayout m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::BufferBindingLayout>(
            context,
            std::make_shared<wgpu::BufferBindingLayout>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiBufferBindingLayout, BufferBindingLayout)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::BufferBindingLayout>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiBufferBindingLayout>(runtime)->getObject();
  }
};
} // namespace RNSkia
