#pragma once
#include <memory>
#include <string>
#include <utility>

#include "dawn/webgpu_cpp.h"

#include <jsi/jsi.h>

#include "JsiBlendComponent.h"
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

class JsiBlendState
    : public JsiSkWrappingSharedPtrHostObject<wgpu::BlendState> {
public:
  JsiBlendState(std::shared_ptr<RNSkPlatformContext> context,
                wgpu::BlendState m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::BlendState>(
            context, std::make_shared<wgpu::BlendState>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiBlendState, BlendState)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::BlendState *fromValue(jsi::Runtime &runtime,
                                     const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiBlendState>(runtime)->getObject().get();
    } else {
      auto object = new wgpu::BlendState();

      if (obj.hasProperty(runtime, "color")) {
        auto color = obj.getProperty(runtime, "color");

        object->color = *JsiBlendComponent::fromValue(runtime, color);
      } else {
        throw jsi::JSError(runtime,
                           "Missing mandatory prop color in BlendState");
      }
      if (obj.hasProperty(runtime, "alpha")) {
        auto alpha = obj.getProperty(runtime, "alpha");

        object->alpha = *JsiBlendComponent::fromValue(runtime, alpha);
      } else {
        throw jsi::JSError(runtime,
                           "Missing mandatory prop alpha in BlendState");
      }
      return object;
    }
  }
};
} // namespace RNSkia
