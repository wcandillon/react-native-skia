#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiConstantEntry
    : public JsiSkWrappingSharedPtrHostObject<wgpu::ConstantEntry> {
public:
  JsiConstantEntry(std::shared_ptr<RNSkPlatformContext> context,
                   wgpu::ConstantEntry m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::ConstantEntry>(
            context, std::make_shared<wgpu::ConstantEntry>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiConstantEntry, ConstantEntry)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::ConstantEntry> fromValue(jsi::Runtime &runtime,
                                                        const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiConstantEntry>(runtime)->getObject();
  }
};
} // namespace RNSkia
