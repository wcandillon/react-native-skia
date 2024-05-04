#pragma once
#include <memory>
#include <string>
#include <utility>

#include "dawn/webgpu_cpp.h"

#include <jsi/jsi.h>

#include "JsiBindGroupEntry.h"
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

class JsiBindGroupDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::BindGroupDescriptor> {
public:
  JsiBindGroupDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                         wgpu::BindGroupDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::BindGroupDescriptor>(
            context,
            std::make_shared<wgpu::BindGroupDescriptor>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiBindGroupDescriptor, BindGroupDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::BindGroupDescriptor *fromValue(jsi::Runtime &runtime,
                                              const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiBindGroupDescriptor>(runtime)
          ->getObject()
          .get();
    } else {
      auto object = new wgpu::BindGroupDescriptor();

      if (obj.hasProperty(runtime, "layout")) {
        auto layout = obj.getProperty(runtime, "layout");

        object->layout = *JsiBindGroupLayout::fromValue(runtime, layout);
      } else {
        throw jsi::JSError(
            runtime, "Missing mandatory prop layout in BindGroupDescriptor");
      }
      if (obj.hasProperty(runtime, "entries")) {
        auto entries = obj.getProperty(runtime, "entries");
        auto jsiArray1 = entries.asObject(runtime).asArray(runtime);
        auto jsiArray1Size = static_cast<int>(jsiArray1.size(runtime));
        auto array1 = new std::vector<wgpu::BindGroupEntry>();
        array1->reserve(jsiArray1Size);
        for (int i = 0; i < jsiArray1Size; i++) {
          auto element = JsiBindGroupEntry::fromValue(
              runtime, jsiArray1.getValueAtIndex(runtime, i));
          array1->push_back(*element);
        }

        object->entryCount = jsiArray1Size;
        object->entries = array1->data();
      } else {
        throw jsi::JSError(
            runtime, "Missing mandatory prop entries in BindGroupDescriptor");
      }
      return object;
    }
  }
};
} // namespace RNSkia
