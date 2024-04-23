#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiBuffer.h"
#include "JsiSampler.h"
#include "JsiTextureView.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiBindGroupEntry
    : public JsiSkWrappingSharedPtrHostObject<wgpu::BindGroupEntry> {
public:
  JsiBindGroupEntry(std::shared_ptr<RNSkPlatformContext> context,
                    wgpu::BindGroupEntry m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::BindGroupEntry>(
            context, std::make_shared<wgpu::BindGroupEntry>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiBindGroupEntry, BindGroupEntry)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::BindGroupEntry>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiBindGroupEntry>(runtime)->getObject();
  }
};
} // namespace RNSkia
