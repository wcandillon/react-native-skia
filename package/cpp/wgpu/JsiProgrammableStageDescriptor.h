#pragma once
#include <memory>
#include <string>
#include <utility>

#include "dawn/webgpu_cpp.h"

#include <jsi/jsi.h>

#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiShaderModule.h"
#include "JsiSkHostObjects.h"
#include "JsiTextureView.h"
#include "MutableJSIBuffer.h"
#include "RNSkLog.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiProgrammableStageDescriptor : public JsiSkWrappingSharedPtrHostObject<
                                           wgpu::ProgrammableStageDescriptor> {
public:
  JsiProgrammableStageDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                                 wgpu::ProgrammableStageDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::ProgrammableStageDescriptor>(
            context,
            std::make_shared<wgpu::ProgrammableStageDescriptor>(std::move(m))) {
  }

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiProgrammableStageDescriptor,
                           ProgrammableStageDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::ProgrammableStageDescriptor *fromValue(jsi::Runtime &runtime,
                                                      const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiProgrammableStageDescriptor>(runtime)
          ->getObject()
          .get();
    } else {
      auto object = new wgpu::ProgrammableStageDescriptor();

      if (obj.hasProperty(runtime, "module")) {
        auto module = obj.getProperty(runtime, "module");

        object->module = *JsiShaderModule::fromValue(runtime, module);
      } else {
        throw jsi::JSError(
            runtime,
            "Missing mandatory prop module in ProgrammableStageDescriptor");
      }
      if (obj.hasProperty(runtime, "entryPoint")) {
        auto entryPoint = obj.getProperty(runtime, "entryPoint");

        object->entryPoint =
            strdup(entryPoint.getString(runtime).utf8(runtime).c_str());
      } else {
        throw jsi::JSError(
            runtime,
            "Missing mandatory prop entryPoint in ProgrammableStageDescriptor");
      }
      return object;
    }
  }
};
} // namespace RNSkia
