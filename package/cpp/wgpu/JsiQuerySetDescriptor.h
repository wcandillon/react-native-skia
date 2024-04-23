#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiQuerySetDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::QuerySetDescriptor> {
public:
  JsiQuerySetDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                        wgpu::QuerySetDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::QuerySetDescriptor>(
            context, std::make_shared<wgpu::QuerySetDescriptor>(std::move(m))) {
  }

  EXPORT_JSI_API_TYPENAME(JsiQuerySetDescriptor, QuerySetDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::QuerySetDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiQuerySetDescriptor>(runtime)->getObject();
  }
};
} // namespace RNSkia
