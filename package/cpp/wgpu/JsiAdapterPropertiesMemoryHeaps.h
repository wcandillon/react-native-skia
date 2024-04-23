#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiMemoryHeapInfo.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiAdapterPropertiesMemoryHeaps
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::AdapterPropertiesMemoryHeaps> {
public:
  JsiAdapterPropertiesMemoryHeaps(std::shared_ptr<RNSkPlatformContext> context,
                                  wgpu::AdapterPropertiesMemoryHeaps m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::AdapterPropertiesMemoryHeaps>(
            context, std::make_shared<wgpu::AdapterPropertiesMemoryHeaps>(
                         std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiAdapterPropertiesMemoryHeaps,
                          AdapterPropertiesMemoryHeaps)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::AdapterPropertiesMemoryHeaps>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiAdapterPropertiesMemoryHeaps>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
