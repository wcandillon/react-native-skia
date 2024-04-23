#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiDawnBufferDescriptorErrorInfoFromWireClient
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::DawnBufferDescriptorErrorInfoFromWireClient> {
public:
  JsiDawnBufferDescriptorErrorInfoFromWireClient(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::DawnBufferDescriptorErrorInfoFromWireClient m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::DawnBufferDescriptorErrorInfoFromWireClient>(
            context,
            std::make_shared<wgpu::DawnBufferDescriptorErrorInfoFromWireClient>(
                std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiDawnBufferDescriptorErrorInfoFromWireClient,
                          DawnBufferDescriptorErrorInfoFromWireClient)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::DawnBufferDescriptorErrorInfoFromWireClient>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object
        .asHostObject<JsiDawnBufferDescriptorErrorInfoFromWireClient>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
