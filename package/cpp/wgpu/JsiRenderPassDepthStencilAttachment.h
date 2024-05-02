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

class JsiRenderPassDepthStencilAttachment
    : public JsiSkWrappingSharedPtrHostObject<
          wgpu::RenderPassDepthStencilAttachment> {
public:
  JsiRenderPassDepthStencilAttachment(
      std::shared_ptr<RNSkPlatformContext> context,
      wgpu::RenderPassDepthStencilAttachment m)
      : JsiSkWrappingSharedPtrHostObject<
            wgpu::RenderPassDepthStencilAttachment>(
            context, std::make_shared<wgpu::RenderPassDepthStencilAttachment>(
                         std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiRenderPassDepthStencilAttachment,
                           RenderPassDepthStencilAttachment)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::RenderPassDepthStencilAttachment *
  fromValue(jsi::Runtime &runtime, const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiRenderPassDepthStencilAttachment>(runtime)
          ->getObject()
          .get();
    } else {
      auto object = new wgpu::RenderPassDepthStencilAttachment();

      if (obj.hasProperty(runtime, "view")) {
        auto view = obj.getProperty(runtime, "view");

        object->view = *JsiTextureView::fromValue(runtime, view);
      } else {
        throw jsi::JSError(
            runtime,
            "Missing mandatory prop view in RenderPassDepthStencilAttachment");
      }
      if (obj.hasProperty(runtime, "depthClearValue")) {
        auto depthClearValue = obj.getProperty(runtime, "depthClearValue");

        object->depthClearValue =
            static_cast<uint32_t>(depthClearValue.getNumber());
      } else {
        throw jsi::JSError(runtime, "Missing mandatory prop depthClearValue in "
                                    "RenderPassDepthStencilAttachment");
      }
      if (obj.hasProperty(runtime, "depthLoadOp")) {
        auto depthLoadOp = obj.getProperty(runtime, "depthLoadOp");

        object->depthLoadOp =
            getLoadOp(depthLoadOp.getString(runtime).utf8(runtime).c_str());
      } else {
        throw jsi::JSError(runtime, "Missing mandatory prop depthLoadOp in "
                                    "RenderPassDepthStencilAttachment");
      }
      if (obj.hasProperty(runtime, "depthStoreOp")) {
        auto depthStoreOp = obj.getProperty(runtime, "depthStoreOp");

        object->depthStoreOp =
            getStoreOp(depthStoreOp.getString(runtime).utf8(runtime).c_str());
      } else {
        throw jsi::JSError(runtime, "Missing mandatory prop depthStoreOp in "
                                    "RenderPassDepthStencilAttachment");
      }
      return object;
    }
  }
};
} // namespace RNSkia
