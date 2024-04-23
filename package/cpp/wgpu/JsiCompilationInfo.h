#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiCompilationMessage.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiCompilationInfo
    : public JsiSkWrappingSharedPtrHostObject<wgpu::CompilationInfo> {
public:
  JsiCompilationInfo(std::shared_ptr<RNSkPlatformContext> context,
                     wgpu::CompilationInfo m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::CompilationInfo>(
            context, std::make_shared<wgpu::CompilationInfo>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiCompilationInfo, CompilationInfo)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::CompilationInfo>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiCompilationInfo>(runtime)->getObject();
  }
};
} // namespace RNSkia
