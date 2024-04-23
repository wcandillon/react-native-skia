#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSharedFenceDxgiSharedHandleDescriptor
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SharedFenceDxgiSharedHandleDescriptor> {
public:
  JsiSharedFenceDxgiSharedHandleDescriptor(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::SharedFenceDxgiSharedHandleDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::SharedFenceDxgiSharedHandleDescriptor>(
            context,
            std::make_shared<wgpu::SharedFenceDxgiSharedHandleDescriptor>(
                std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSharedFenceDxgiSharedHandleDescriptor,
                          SharedFenceDxgiSharedHandleDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SharedFenceDxgiSharedHandleDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object
        .asHostObject<JsiSharedFenceDxgiSharedHandleDescriptor>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
