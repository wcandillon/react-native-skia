#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiPipelineLayoutStorageAttachment
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::PipelineLayoutStorageAttachment> {
public:
  JsiPipelineLayoutStorageAttachment(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::PipelineLayoutStorageAttachment m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::PipelineLayoutStorageAttachment>(
            context, std::make_shared<wgpu::PipelineLayoutStorageAttachment>(
                         std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiPipelineLayoutStorageAttachment,
                          PipelineLayoutStorageAttachment)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::PipelineLayoutStorageAttachment>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiPipelineLayoutStorageAttachment>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
