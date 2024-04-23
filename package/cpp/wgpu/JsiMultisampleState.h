#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiMultisampleState
    : public JsiSkWrappingSharedPtrHostObject<wgpu::MultisampleState> {
public:
  JsiMultisampleState(std::shared_ptr<RNSkPlatformContext> context,
                      wgpu::MultisampleState m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::MultisampleState>(
            context, std::make_shared<wgpu::MultisampleState>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiMultisampleState, MultisampleState)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::MultisampleState>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiMultisampleState>(runtime)->getObject();
  }
};
} // namespace RNSkia
