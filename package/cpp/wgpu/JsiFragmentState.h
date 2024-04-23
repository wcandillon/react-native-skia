#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiColorTargetState.h"
#include "JsiConstantEntry.h"
#include "JsiShaderModule.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiFragmentState
    : public JsiSkWrappingSharedPtrHostObject<wgpu::FragmentState> {
public:
  JsiFragmentState(std::shared_ptr<RNSkPlatformContext> context,
                   wgpu::FragmentState m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::FragmentState>(
            context, std::make_shared<wgpu::FragmentState>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiFragmentState, FragmentState)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::FragmentState> fromValue(jsi::Runtime &runtime,
                                                        const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiFragmentState>(runtime)->getObject();
  }
};
} // namespace RNSkia
