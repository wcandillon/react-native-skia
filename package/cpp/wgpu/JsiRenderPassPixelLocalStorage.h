#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiRenderPassStorageAttachment.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiRenderPassPixelLocalStorage : public JsiSkWrappingSharedPtrHostObject<
                                           wgpu::RenderPassPixelLocalStorage> {
public:
  JsiRenderPassPixelLocalStorage(std::shared_ptr<RNSkPlatformContext> context,
                                 wgpu::RenderPassPixelLocalStorage m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::RenderPassPixelLocalStorage>(
            context,
            std::make_shared<wgpu::RenderPassPixelLocalStorage>(std::move(m))) {
  }

  EXPORT_JSI_API_TYPENAME(JsiRenderPassPixelLocalStorage,
                          RenderPassPixelLocalStorage)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::RenderPassPixelLocalStorage>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiRenderPassPixelLocalStorage>(runtime)
        ->getObject();
  }
};
} // namespace RNSkia
