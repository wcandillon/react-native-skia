#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSharedFenceVkSemaphoreSyncFdDescriptor
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SharedFenceVkSemaphoreSyncFdDescriptor> {
public:
  JsiSharedFenceVkSemaphoreSyncFdDescriptor(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::SharedFenceVkSemaphoreSyncFdDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::SharedFenceVkSemaphoreSyncFdDescriptor>(
            context,
            std::make_shared<wgpu::SharedFenceVkSemaphoreSyncFdDescriptor>(
                std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSharedFenceVkSemaphoreSyncFdDescriptor,
                          SharedFenceVkSemaphoreSyncFdDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SharedFenceVkSemaphoreSyncFdDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object
        .asHostObject<JsiSharedFenceVkSemaphoreSyncFdDescriptor>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
