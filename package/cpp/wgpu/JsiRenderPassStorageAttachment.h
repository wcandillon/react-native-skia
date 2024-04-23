#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiColor.h"
#include "JsiTextureView.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiRenderPassStorageAttachment : public JsiSkWrappingSharedPtrHostObject<
                                           wgpu::RenderPassStorageAttachment> {
public:
  JsiRenderPassStorageAttachment(std::shared_ptr<RNSkPlatformContext> context,
                                 wgpu::RenderPassStorageAttachment m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::RenderPassStorageAttachment>(
            context,
            std::make_shared<wgpu::RenderPassStorageAttachment>(std::move(m))) {
  }

  EXPORT_JSI_API_TYPENAME(JsiRenderPassStorageAttachment,
                          RenderPassStorageAttachment)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::RenderPassStorageAttachment>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiRenderPassStorageAttachment>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
