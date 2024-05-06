#pragma once
#include <memory>
#include <string>
#include <utility>

#include "dawn/webgpu_cpp.h"

#include <jsi/jsi.h>

#include "JsiBindGroupLayout.h"
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

class JsiPipelineLayoutDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::PipelineLayoutDescriptor> {
public:
  JsiPipelineLayoutDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                              wgpu::PipelineLayoutDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::PipelineLayoutDescriptor>(
            context,
            std::make_shared<wgpu::PipelineLayoutDescriptor>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiPipelineLayoutDescriptor,
                           PipelineLayoutDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::PipelineLayoutDescriptor *fromValue(jsi::Runtime &runtime,
                                                   const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiPipelineLayoutDescriptor>(runtime)
          ->getObject()
          .get();
    } else {
      auto object = new wgpu::PipelineLayoutDescriptor();

      if (obj.hasProperty(runtime, "bindGroupLayouts")) {
        auto bindGroupLayouts = obj.getProperty(runtime, "bindGroupLayouts");
        auto jsiArray0 = bindGroupLayouts.asObject(runtime).asArray(runtime);
        auto jsiArray0Size = static_cast<int>(jsiArray0.size(runtime));
        auto array0 = new std::vector<wgpu::BindGroupLayout>();
        array0->reserve(jsiArray0Size);
        for (int i = 0; i < jsiArray0Size; i++) {
          auto element = JsiBindGroupLayout::fromValue(
              runtime, jsiArray0.getValueAtIndex(runtime, i));
          array0->push_back(*element);
        }

        object->bindGroupLayoutCount = jsiArray0Size;
        object->bindGroupLayouts = array0->data();
      } else {
        throw jsi::JSError(runtime, "Missing mandatory prop bindGroupLayouts "
                                    "in PipelineLayoutDescriptor");
      }
      return object;
    }
  }
};
} // namespace RNSkia
