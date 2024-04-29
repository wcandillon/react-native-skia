#pragma once
#include <memory>
#include <string>
#include <utility>

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiBlendState.h"
#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkLog.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiColorTargetState
    : public JsiSkWrappingSharedPtrHostObject<wgpu::ColorTargetState> {
public:
  JsiColorTargetState(std::shared_ptr<RNSkPlatformContext> context,
                      wgpu::ColorTargetState m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::ColorTargetState>(
            context, std::make_shared<wgpu::ColorTargetState>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiColorTargetState, ColorTargetState)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::ColorTargetState *fromValue(jsi::Runtime &runtime,
                                           const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiColorTargetState>(runtime)->getObject().get();
    } else {
      auto object = new wgpu::ColorTargetState();
      object->setDefault();
      object->writeMask = wgpu::ColorWriteMask::All;
      if (obj.hasProperty(runtime, "format")) {
        auto format = obj.getProperty(runtime, "format");

        object->format =
            getTextureFormat(format.getString(runtime).utf8(runtime).c_str());
      } else {
        throw jsi::JSError(runtime,
                           "Missing mandatory prop format in ColorTargetState");
      }
      if (obj.hasProperty(runtime, "blend")) {
        auto blend = obj.getProperty(runtime, "blend");

        object->blend = JsiBlendState::fromValue(runtime, blend);
      }
      if (obj.hasProperty(runtime, "writeMask")) {
        auto writeMask = obj.getProperty(runtime, "writeMask");

        object->writeMask = static_cast<uint32_t>(writeMask.getNumber());
      }
      return object;
    }
  }
};
} // namespace RNSkia
