#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSharedFenceDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::SharedFenceDescriptor> {
public:
  JsiSharedFenceDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                           wgpu::SharedFenceDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::SharedFenceDescriptor>(
            context,
            std::make_shared<wgpu::SharedFenceDescriptor>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSharedFenceDescriptor, SharedFenceDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SharedFenceDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiSharedFenceDescriptor>(runtime)->getObject();
  }
};
} // namespace RNSkia
