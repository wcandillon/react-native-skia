#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiDawnMultisampleStateRenderToSingleSampled
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::DawnMultisampleStateRenderToSingleSampled> {
public:
  JsiDawnMultisampleStateRenderToSingleSampled(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::DawnMultisampleStateRenderToSingleSampled m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::DawnMultisampleStateRenderToSingleSampled>(
            context,
            std::make_shared<wgpu::DawnMultisampleStateRenderToSingleSampled>(
                std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiDawnMultisampleStateRenderToSingleSampled,
                          DawnMultisampleStateRenderToSingleSampled)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::DawnMultisampleStateRenderToSingleSampled>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object
        .asHostObject<JsiDawnMultisampleStateRenderToSingleSampled>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
