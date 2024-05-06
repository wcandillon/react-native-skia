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

class JsiSampler : public JsiSkWrappingSharedPtrHostObject<wgpu::Sampler> {
public:
  JsiSampler(std::shared_ptr<RNSkPlatformContext> context, wgpu::Sampler m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Sampler>(
            context, std::make_shared<wgpu::Sampler>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiSampler, Sampler)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::Sampler *fromValue(jsi::Runtime &runtime,
                                  const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiSampler>(runtime)->getObject().get();
    } else {
      throw jsi::JSError(runtime, "Expected a JsiSampler object, but got a " +
                                      raw.toString(runtime).utf8(runtime));
    }
  }
};
} // namespace RNSkia
