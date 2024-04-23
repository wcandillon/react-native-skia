#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiMemoryHeapInfo
    : public JsiSkWrappingSharedPtrHostObject<wgpu::MemoryHeapInfo> {
public:
  JsiMemoryHeapInfo(std::shared_ptr<RNSkPlatformContext> context,
                    wgpu::MemoryHeapInfo m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::MemoryHeapInfo>(
            context, std::make_shared<wgpu::MemoryHeapInfo>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiMemoryHeapInfo, MemoryHeapInfo)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::MemoryHeapInfo>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiMemoryHeapInfo>(runtime)->getObject();
  }
};
} // namespace RNSkia
