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

class JsiComputePipeline
    : public JsiSkWrappingSharedPtrHostObject<wgpu::ComputePipeline> {
public:
  JsiComputePipeline(std::shared_ptr<RNSkPlatformContext> context,
                     wgpu::ComputePipeline m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::ComputePipeline>(
            context, std::make_shared<wgpu::ComputePipeline>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiComputePipeline, ComputePipeline)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::ComputePipeline *fromValue(jsi::Runtime &runtime,
                                          const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiComputePipeline>(runtime)->getObject().get();
    } else {
      throw jsi::JSError(runtime,
                         "Expected a JsiComputePipeline object, but got a " +
                             raw.toString(runtime).utf8(runtime));
    }
  }
};
} // namespace RNSkia
