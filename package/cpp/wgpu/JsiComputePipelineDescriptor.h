#pragma once
#include <memory>
#include <string>
#include <utility>

#include "dawn/webgpu_cpp.h"

#include <jsi/jsi.h>

#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPipelineLayout.h"
#include "JsiProgrammableStageDescriptor.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "JsiTextureView.h"
#include "MutableJSIBuffer.h"
#include "RNSkLog.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiComputePipelineDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::ComputePipelineDescriptor> {
public:
  JsiComputePipelineDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                               wgpu::ComputePipelineDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::ComputePipelineDescriptor>(
            context,
            std::make_shared<wgpu::ComputePipelineDescriptor>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiComputePipelineDescriptor,
                           ComputePipelineDescriptor)

  static wgpu::ComputePipelineDescriptor *fromValue(jsi::Runtime &runtime,
                                                    const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiComputePipelineDescriptor>(runtime)
          ->getObject()
          .get();
    } else {
      auto object = new wgpu::ComputePipelineDescriptor();

      // if (obj.hasProperty(runtime, "layout")) {
      //   auto layout = obj.getProperty(runtime, "layout");

      //   object->layout = *JsiPipelineLayout::fromValue(runtime, layout);
      // }
      if (obj.hasProperty(runtime, "compute")) {
        auto compute = obj.getProperty(runtime, "compute");

        object->compute =
            *JsiProgrammableStageDescriptor::fromValue(runtime, compute);
      } else {
        throw jsi::JSError(
            runtime,
            "Missing mandatory prop compute in ComputePipelineDescriptor");
      }
      return object;
    }
  }
};
} // namespace RNSkia
