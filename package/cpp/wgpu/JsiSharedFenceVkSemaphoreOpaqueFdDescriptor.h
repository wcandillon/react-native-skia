#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSharedFenceVkSemaphoreOpaqueFdDescriptor
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SharedFenceVkSemaphoreOpaqueFdDescriptor> {
public:
  JsiSharedFenceVkSemaphoreOpaqueFdDescriptor(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::SharedFenceVkSemaphoreOpaqueFdDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::SharedFenceVkSemaphoreOpaqueFdDescriptor>(
            context,
            std::make_shared<wgpu::SharedFenceVkSemaphoreOpaqueFdDescriptor>(
                std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSharedFenceVkSemaphoreOpaqueFdDescriptor,
                          SharedFenceVkSemaphoreOpaqueFdDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SharedFenceVkSemaphoreOpaqueFdDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object
        .asHostObject<JsiSharedFenceVkSemaphoreOpaqueFdDescriptor>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
