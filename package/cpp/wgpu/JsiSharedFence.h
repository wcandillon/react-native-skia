#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiSharedFenceExportInfo.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSharedFence
    : public JsiSkWrappingSharedPtrHostObject<wgpu::SharedFence> {
public:
  JsiSharedFence(std::shared_ptr<RNSkPlatformContext> context,
                 wgpu::SharedFence m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::SharedFence>(
            context, std::make_shared<wgpu::SharedFence>(std::move(m))) {}

  JSI_HOST_FUNCTION(exportInfo) {
    auto info = JsiSharedFenceExportInfo::fromValue(runtime, arguments[0]);
    auto ret = getObject()->exportInfo(*info.get());
    return jsi::Value(ret);
  }

  EXPORT_JSI_API_TYPENAME(JsiSharedFence, SharedFence)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiSharedFence, exportInfo))

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SharedFence> fromValue(jsi::Runtime &runtime,
                                                      const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiSharedFence>(runtime)->getObject();
  }
};
} // namespace RNSkia
