#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiQueueDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::QueueDescriptor> {
public:
  JsiQueueDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                     wgpu::QueueDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::QueueDescriptor>(
            context, std::make_shared<wgpu::QueueDescriptor>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiQueueDescriptor, QueueDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::QueueDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiQueueDescriptor>(runtime)->getObject();
  }
};
} // namespace RNSkia
