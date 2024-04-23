#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiDeviceDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::DeviceDescriptor> {
public:
  JsiDeviceDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                      wgpu::DeviceDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::DeviceDescriptor>(
            context, std::make_shared<wgpu::DeviceDescriptor>(std::move(m))) {}

  EXPORT_JSI_API_BRANDNAME(JsiDeviceDescriptor, DeviceDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::DeviceDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiDeviceDescriptor>(runtime)->getObject();
  }
};
} // namespace RNSkia
