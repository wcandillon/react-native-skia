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

class JsiMultisampleState
    : public JsiSkWrappingSharedPtrHostObject<wgpu::MultisampleState> {
public:
  JsiMultisampleState(std::shared_ptr<RNSkPlatformContext> context,
                      wgpu::MultisampleState m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::MultisampleState>(
            context, std::make_shared<wgpu::MultisampleState>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiMultisampleState, MultisampleState)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::MultisampleState *fromValue(jsi::Runtime &runtime,
                                           const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiMultisampleState>(runtime)->getObject().get();
    } else {
      auto object = new wgpu::MultisampleState();

      if (obj.hasProperty(runtime, "count")) {
        auto count = obj.getProperty(runtime, "count");

        object->count = static_cast<uint32_t>(count.getNumber());
      }
      if (obj.hasProperty(runtime, "mask")) {
        auto mask = obj.getProperty(runtime, "mask");

        object->mask = static_cast<uint32_t>(mask.getNumber());
      }
      if (obj.hasProperty(runtime, "alphaToCoverageEnabled")) {
        auto alphaToCoverageEnabled =
            obj.getProperty(runtime, "alphaToCoverageEnabled");

        object->alphaToCoverageEnabled =
            static_cast<uint32_t>(alphaToCoverageEnabled.getBool());
      }
      return object;
    }
  }
};
} // namespace RNSkia
