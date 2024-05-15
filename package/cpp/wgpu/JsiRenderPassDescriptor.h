#pragma once
#include <memory>
#include <string>
#include <utility>

#include "dawn/webgpu_cpp.h"

#include <jsi/jsi.h>

#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiRenderPassColorAttachment.h"
#include "JsiSkHostObjects.h"
#include "JsiTextureView.h"
#include "MutableJSIBuffer.h"
#include "RNSkLog.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiRenderPassDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::RenderPassDescriptor> {
public:
  JsiRenderPassDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                          wgpu::RenderPassDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::RenderPassDescriptor>(
            context,
            std::make_shared<wgpu::RenderPassDescriptor>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiRenderPassDescriptor, RenderPassDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::RenderPassDescriptor *fromValue(jsi::Runtime &runtime,
                                               const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiRenderPassDescriptor>(runtime)
          ->getObject()
          .get();
    } else {
      auto object = new wgpu::RenderPassDescriptor();

      if (obj.hasProperty(runtime, "colorAttachments")) {
        auto colorAttachments = obj.getProperty(runtime, "colorAttachments");
        auto jsiArray0 = colorAttachments.asObject(runtime).asArray(runtime);
        auto jsiArray0Size = static_cast<int>(jsiArray0.size(runtime));
        auto array0 = new std::vector<wgpu::RenderPassColorAttachment>();
        array0->reserve(jsiArray0Size);
        for (int i = 0; i < jsiArray0Size; i++) {
          auto element = JsiRenderPassColorAttachment::fromValue(
              runtime, jsiArray0.getValueAtIndex(runtime, i));
          array0->push_back(*element);
        }

        object->colorAttachmentCount = jsiArray0Size;
        object->colorAttachments = array0->data();
      } else {
        throw jsi::JSError(
            runtime,
            "Missing mandatory prop colorAttachments in RenderPassDescriptor");
      }
      return object;
    }
  }
};
} // namespace RNSkia
