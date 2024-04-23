#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiAdapterProperties
    : public JsiSkWrappingSharedPtrHostObject<wgpu::AdapterProperties> {
public:
  JsiAdapterProperties(std::shared_ptr<RNSkPlatformContext> context,
                       wgpu::AdapterProperties m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::AdapterProperties>(
            context, std::make_shared<wgpu::AdapterProperties>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiAdapterProperties, AdapterProperties)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::AdapterProperties>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiAdapterProperties>(runtime)->getObject();
  }
};
} // namespace RNSkia
