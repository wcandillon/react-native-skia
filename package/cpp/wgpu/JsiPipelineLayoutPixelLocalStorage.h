#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiPipelineLayoutStorageAttachment.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiPipelineLayoutPixelLocalStorage
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::PipelineLayoutPixelLocalStorage> {
public:
  JsiPipelineLayoutPixelLocalStorage(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::PipelineLayoutPixelLocalStorage m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::PipelineLayoutPixelLocalStorage>(
            context, std::make_shared<wgpu::PipelineLayoutPixelLocalStorage>(
                         std::move(m))) {}

  EXPORT_JSI_API_TYPENAME(JsiPipelineLayoutPixelLocalStorage,
                          PipelineLayoutPixelLocalStorage)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::PipelineLayoutPixelLocalStorage>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiPipelineLayoutPixelLocalStorage>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
