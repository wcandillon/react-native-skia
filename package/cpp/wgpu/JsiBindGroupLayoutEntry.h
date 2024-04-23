#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiBufferBindingLayout.h"
#include "JsiSamplerBindingLayout.h"
#include "JsiStorageTextureBindingLayout.h"
#include "JsiTextureBindingLayout.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiBindGroupLayoutEntry
    : public JsiSkWrappingSharedPtrHostObject<wgpu::BindGroupLayoutEntry> {
public:
  JsiBindGroupLayoutEntry(std::shared_ptr<RNSkPlatformContext> context,
                          wgpu::BindGroupLayoutEntry m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::BindGroupLayoutEntry>(
            context,
            std::make_shared<wgpu::BindGroupLayoutEntry>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiBindGroupLayoutEntry, BindGroupLayoutEntry)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::BindGroupLayoutEntry>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiBindGroupLayoutEntry>(runtime)->getObject();
  }
};
} // namespace RNSkia
