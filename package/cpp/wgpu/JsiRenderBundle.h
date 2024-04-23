#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiRenderBundle
    : public JsiSkWrappingSharedPtrHostObject<wgpu::RenderBundle> {
public:
  JsiRenderBundle(std::shared_ptr<RNSkPlatformContext> context,
                  wgpu::RenderBundle m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::RenderBundle>(
            context, std::make_shared<wgpu::RenderBundle>(std::move(m))) {}

  JSI_HOST_FUNCTION(setLabel) {
    auto label = JsiChar::fromValue(runtime, arguments[0]);
    auto ret = getObject()->setLabel(*label.get());
    return jsi::Value(ret);
  }

  EXPORT_JSI_API_TYPENAME(JsiRenderBundle, RenderBundle)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiRenderBundle, setLabel))

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::RenderBundle> fromValue(jsi::Runtime &runtime,
                                                       const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiRenderBundle>(runtime)->getObject();
  }
};
} // namespace RNSkia
