#pragma once
#include <memory>
#include <string>
#include <utility>

#include "dawn/webgpu_cpp.h"

#include <jsi/jsi.h>

#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "JsiTextureView.h"
#include "MutableJSIBuffer.h"
#include "RNSkLog.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiBlendComponent
    : public JsiSkWrappingSharedPtrHostObject<wgpu::BlendComponent> {
public:
  JsiBlendComponent(std::shared_ptr<RNSkPlatformContext> context,
                    wgpu::BlendComponent m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::BlendComponent>(
            context, std::make_shared<wgpu::BlendComponent>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiBlendComponent, BlendComponent)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::BlendComponent *fromValue(jsi::Runtime &runtime,
                                         const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiBlendComponent>(runtime)->getObject().get();
    } else {
      auto object = new wgpu::BlendComponent();

      if (obj.hasProperty(runtime, "operation")) {
        auto operation = obj.getProperty(runtime, "operation");

        object->operation = getBlendOperation(
            operation.getString(runtime).utf8(runtime).c_str());
      }
      if (obj.hasProperty(runtime, "srcFactor")) {
        auto srcFactor = obj.getProperty(runtime, "srcFactor");

        object->srcFactor =
            getBlendFactor(srcFactor.getString(runtime).utf8(runtime).c_str());
      }
      if (obj.hasProperty(runtime, "dstFactor")) {
        auto dstFactor = obj.getProperty(runtime, "dstFactor");

        object->dstFactor =
            getBlendFactor(dstFactor.getString(runtime).utf8(runtime).c_str());
      }
      return object;
    }
  }
};
} // namespace RNSkia
