#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSharedFenceExportInfo
    : public JsiSkWrappingSharedPtrHostObject<wgpu::SharedFenceExportInfo> {
public:
  JsiSharedFenceExportInfo(std::shared_ptr<RNSkPlatformContext> context,
                           wgpu::SharedFenceExportInfo m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::SharedFenceExportInfo>(
            context,
            std::make_shared<wgpu::SharedFenceExportInfo>(std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSharedFenceExportInfo, SharedFenceExportInfo)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SharedFenceExportInfo>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiSharedFenceExportInfo>(runtime)->getObject();
  }
};
} // namespace RNSkia
