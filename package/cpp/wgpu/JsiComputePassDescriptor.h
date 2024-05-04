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

class JsiComputePassDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::ComputePassDescriptor> {
public:
  JsiComputePassDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                           wgpu::ComputePassDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::ComputePassDescriptor>(
            context,
            std::make_shared<wgpu::ComputePassDescriptor>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiComputePassDescriptor, ComputePassDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::ComputePassDescriptor *fromValue(jsi::Runtime &runtime,
                                                const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiComputePassDescriptor>(runtime)
          ->getObject()
          .get();
    } else {
      throw jsi::JSError(
          runtime, "Expected a JsiComputePassDescriptor object, but got a " +
                       raw.toString(runtime).utf8(runtime));
    }
  }
};
} // namespace RNSkia
