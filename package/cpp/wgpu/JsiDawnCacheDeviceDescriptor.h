#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiDawnCacheDeviceDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::DawnCacheDeviceDescriptor> {
public:
  JsiDawnCacheDeviceDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                               wgpu::DawnCacheDeviceDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::DawnCacheDeviceDescriptor>(
            context,
            std::make_shared<wgpu::DawnCacheDeviceDescriptor>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiDawnCacheDeviceDescriptor,
                          DawnCacheDeviceDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::DawnCacheDeviceDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiDawnCacheDeviceDescriptor>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
