#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiConstantEntry.h"
#include "JsiShaderModule.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiProgrammableStageDescriptor : public JsiSkWrappingSharedPtrHostObject<
                                           wgpu::ProgrammableStageDescriptor> {
public:
  JsiProgrammableStageDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                                 wgpu::ProgrammableStageDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::ProgrammableStageDescriptor>(
            context,
            std::make_shared<wgpu::ProgrammableStageDescriptor>(std::move(m))) {
  }

  EXPORT_JSI_API_TYPENAME(JsiProgrammableStageDescriptor,
                          ProgrammableStageDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::ProgrammableStageDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiProgrammableStageDescriptor>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
