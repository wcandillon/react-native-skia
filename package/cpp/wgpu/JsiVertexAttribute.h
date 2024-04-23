#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiVertexAttribute
    : public JsiSkWrappingSharedPtrHostObject<wgpu::VertexAttribute> {
public:
  JsiVertexAttribute(std::shared_ptr<RNSkPlatformContext> context,
                     wgpu::VertexAttribute m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::VertexAttribute>(
            context, std::make_shared<wgpu::VertexAttribute>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiVertexAttribute, VertexAttribute)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::VertexAttribute>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiVertexAttribute>(runtime)->getObject();
  }
};
} // namespace RNSkia
