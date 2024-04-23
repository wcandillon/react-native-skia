#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSharedFenceVkSemaphoreZirconHandleExportInfo
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SharedFenceVkSemaphoreZirconHandleExportInfo> {
public:
  JsiSharedFenceVkSemaphoreZirconHandleExportInfo(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::SharedFenceVkSemaphoreZirconHandleExportInfo m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::SharedFenceVkSemaphoreZirconHandleExportInfo>(
            context, std::make_shared<
                         wgpu::SharedFenceVkSemaphoreZirconHandleExportInfo>(
                         std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSharedFenceVkSemaphoreZirconHandleExportInfo,
                          SharedFenceVkSemaphoreZirconHandleExportInfo)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SharedFenceVkSemaphoreZirconHandleExportInfo>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object
        .asHostObject<JsiSharedFenceVkSemaphoreZirconHandleExportInfo>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
