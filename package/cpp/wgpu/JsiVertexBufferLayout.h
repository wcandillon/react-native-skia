#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiVertexAttribute.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiVertexBufferLayout
    : public JsiSkWrappingSharedPtrHostObject<wgpu::VertexBufferLayout> {
public:
  JsiVertexBufferLayout(std::shared_ptr<RNSkPlatformContext> context,
                        wgpu::VertexBufferLayout m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::VertexBufferLayout>(
            context, std::make_shared<wgpu::VertexBufferLayout>(std::move(m))) {
  }

  EXPORT_JSI_API_TYPENAME(JsiVertexBufferLayout, VertexBufferLayout)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::VertexBufferLayout>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiVertexBufferLayout>(runtime)->getObject();
  }
};
} // namespace RNSkia
