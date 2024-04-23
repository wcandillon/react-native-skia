#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSharedFenceVkSemaphoreSyncFdExportInfo
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SharedFenceVkSemaphoreSyncFdExportInfo> {
public:
  JsiSharedFenceVkSemaphoreSyncFdExportInfo(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::SharedFenceVkSemaphoreSyncFdExportInfo m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::SharedFenceVkSemaphoreSyncFdExportInfo>(
            context,
            std::make_shared<wgpu::SharedFenceVkSemaphoreSyncFdExportInfo>(
                std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSharedFenceVkSemaphoreSyncFdExportInfo,
                          SharedFenceVkSemaphoreSyncFdExportInfo)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SharedFenceVkSemaphoreSyncFdExportInfo>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object
        .asHostObject<JsiSharedFenceVkSemaphoreSyncFdExportInfo>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
