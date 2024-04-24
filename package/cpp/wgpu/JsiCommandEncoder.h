#pragma once
#include <memory>
#include <string>
#include <utility>

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiCommandEncoder
    : public JsiSkWrappingSharedPtrHostObject<wgpu::CommandEncoder> {
public:
  JsiCommandEncoder(std::shared_ptr<RNSkPlatformContext> context,
                    wgpu::CommandEncoder m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::CommandEncoder>(
            context, std::make_shared<wgpu::CommandEncoder>(std::move(m))) {}

  EXPORT_JSI_API_BRANDNAME(JsiCommandEncoder, CommandEncoder)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::CommandEncoder>
  fromValue(jsi::Runtime &runtime, const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiCommandEncoder>(runtime)->getObject();
    } else {
      throw jsi::JSError(runtime,
                         "Expected a JsiCommandEncoder object, but got a " +
                             raw.toString(runtime).utf8(runtime));
    }
  }
};
} // namespace RNSkia
