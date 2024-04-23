#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiCompilationMessage
    : public JsiSkWrappingSharedPtrHostObject<wgpu::CompilationMessage> {
public:
  JsiCompilationMessage(std::shared_ptr<RNSkPlatformContext> context,
                        wgpu::CompilationMessage m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::CompilationMessage>(
            context, std::make_shared<wgpu::CompilationMessage>(std::move(m))) {
  }

  EXPORT_JSI_API_TYPENAME(JsiCompilationMessage, CompilationMessage)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::CompilationMessage>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiCompilationMessage>(runtime)->getObject();
  }
};
} // namespace RNSkia
