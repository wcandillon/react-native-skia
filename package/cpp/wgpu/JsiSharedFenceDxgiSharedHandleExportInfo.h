#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSharedFenceDxgiSharedHandleExportInfo
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SharedFenceDxgiSharedHandleExportInfo> {
public:
  JsiSharedFenceDxgiSharedHandleExportInfo(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::SharedFenceDxgiSharedHandleExportInfo m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::SharedFenceDxgiSharedHandleExportInfo>(
            context,
            std::make_shared<wgpu::SharedFenceDxgiSharedHandleExportInfo>(
                std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSharedFenceDxgiSharedHandleExportInfo,
                          SharedFenceDxgiSharedHandleExportInfo)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SharedFenceDxgiSharedHandleExportInfo>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object
        .asHostObject<JsiSharedFenceDxgiSharedHandleExportInfo>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
