#pragma once
#include <memory>
#include <string>
#include <utility>

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiEnums.h"
#include "JsiGpu.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkLog.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiContext : public JsiSkWrappingSharedPtrHostObject<wgpu::Context> {
public:
  JsiContext(std::shared_ptr<RNSkPlatformContext> context, wgpu::Context m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Context>(
            context, std::make_shared<wgpu::Context>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiContext, Context)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::Context *fromValue(jsi::Runtime &runtime,
                                  const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiContext>(runtime)->getObject().get();
    } else {
      auto object = new wgpu::Context();
      object->setDefault();

      if (obj.hasProperty(runtime, "gpu")) {
        auto gpu = obj.getProperty(runtime, "gpu");

        object->gpu = *JsiGpu::fromValue(runtime, gpu);
      } else {
        throw jsi::JSError(runtime, "Missing mandatory prop gpu in Context");
      }
      return object;
    }
  }
};
} // namespace RNSkia
