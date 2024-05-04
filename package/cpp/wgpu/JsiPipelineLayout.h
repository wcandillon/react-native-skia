#pragma once
#include <memory>
#include <string>
#include <utility>

#include "dawn/webgpu_cpp.h"

#include <jsi/jsi.h>

#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "JsiTextureView.h"
#include "MutableJSIBuffer.h"
#include "RNSkLog.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiPipelineLayout
    : public JsiSkWrappingSharedPtrHostObject<wgpu::PipelineLayout> {
public:
  JsiPipelineLayout(std::shared_ptr<RNSkPlatformContext> context,
                    wgpu::PipelineLayout m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::PipelineLayout>(
            context, std::make_shared<wgpu::PipelineLayout>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiPipelineLayout, PipelineLayout)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::PipelineLayout *fromValue(jsi::Runtime &runtime,
                                         const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiPipelineLayout>(runtime)->getObject().get();
    } else {
      throw jsi::JSError(runtime,
                         "Expected a JsiPipelineLayout object, but got a " +
                             raw.toString(runtime).utf8(runtime));
    }
  }
};
} // namespace RNSkia
