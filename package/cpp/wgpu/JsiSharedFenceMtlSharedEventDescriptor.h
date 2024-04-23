#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSharedFenceMtlSharedEventDescriptor
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SharedFenceMtlSharedEventDescriptor> {
public:
  JsiSharedFenceMtlSharedEventDescriptor(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::SharedFenceMtlSharedEventDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::SharedFenceMtlSharedEventDescriptor>(
            context,
            std::make_shared<wgpu::SharedFenceMtlSharedEventDescriptor>(
                std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSharedFenceMtlSharedEventDescriptor,
                          SharedFenceMtlSharedEventDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SharedFenceMtlSharedEventDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiSharedFenceMtlSharedEventDescriptor>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
