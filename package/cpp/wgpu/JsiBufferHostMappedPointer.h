#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiBufferHostMappedPointer
    : public JsiSkWrappingSharedPtrHostObject<wgpu::BufferHostMappedPointer> {
public:
  JsiBufferHostMappedPointer(std::shared_ptr<RNSkPlatformContext> context,
                             wgpu::BufferHostMappedPointer m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::BufferHostMappedPointer>(
            context,
            std::make_shared<wgpu::BufferHostMappedPointer>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiBufferHostMappedPointer, BufferHostMappedPointer)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::BufferHostMappedPointer>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiBufferHostMappedPointer>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
