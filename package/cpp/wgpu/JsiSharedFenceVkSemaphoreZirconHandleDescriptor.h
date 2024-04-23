#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSharedFenceVkSemaphoreZirconHandleDescriptor
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SharedFenceVkSemaphoreZirconHandleDescriptor> {
public:
  JsiSharedFenceVkSemaphoreZirconHandleDescriptor(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::SharedFenceVkSemaphoreZirconHandleDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::SharedFenceVkSemaphoreZirconHandleDescriptor>(
            context, std::make_shared<
                         wgpu::SharedFenceVkSemaphoreZirconHandleDescriptor>(
                         std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSharedFenceVkSemaphoreZirconHandleDescriptor,
                          SharedFenceVkSemaphoreZirconHandleDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SharedFenceVkSemaphoreZirconHandleDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object
        .asHostObject<JsiSharedFenceVkSemaphoreZirconHandleDescriptor>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
