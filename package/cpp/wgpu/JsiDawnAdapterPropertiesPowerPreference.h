#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiDawnAdapterPropertiesPowerPreference
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::DawnAdapterPropertiesPowerPreference> {
public:
  JsiDawnAdapterPropertiesPowerPreference(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::DawnAdapterPropertiesPowerPreference m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::DawnAdapterPropertiesPowerPreference>(
            context,
            std::make_shared<wgpu::DawnAdapterPropertiesPowerPreference>(
                std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiDawnAdapterPropertiesPowerPreference,
                          DawnAdapterPropertiesPowerPreference)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::DawnAdapterPropertiesPowerPreference>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object
        .asHostObject<JsiDawnAdapterPropertiesPowerPreference>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
