#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSharedFenceMtlSharedEventExportInfo
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::SharedFenceMtlSharedEventExportInfo> {
public:
  JsiSharedFenceMtlSharedEventExportInfo(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::SharedFenceMtlSharedEventExportInfo m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::SharedFenceMtlSharedEventExportInfo>(
            context,
            std::make_shared<wgpu::SharedFenceMtlSharedEventExportInfo>(
                std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiSharedFenceMtlSharedEventExportInfo,
                          SharedFenceMtlSharedEventExportInfo)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SharedFenceMtlSharedEventExportInfo>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiSharedFenceMtlSharedEventExportInfo>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
