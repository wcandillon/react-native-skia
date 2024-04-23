#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiBindGroupLayoutEntry.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiBindGroupLayoutDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::BindGroupLayoutDescriptor> {
public:
  JsiBindGroupLayoutDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                               wgpu::BindGroupLayoutDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::BindGroupLayoutDescriptor>(
            context,
            std::make_shared<wgpu::BindGroupLayoutDescriptor>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiBindGroupLayoutDescriptor,
                          BindGroupLayoutDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::BindGroupLayoutDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiBindGroupLayoutDescriptor>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
