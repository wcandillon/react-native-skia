#pragma once
#include <memory>
#include <string>
#include <utility>

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiColor.h"
#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "JsiTextureView.h"
#include "RNSkLog.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiRenderPassColorAttachment
    : public JsiSkWrappingSharedPtrHostObject<wgpu::RenderPassColorAttachment> {
public:
  JsiRenderPassColorAttachment(std::shared_ptr<RNSkPlatformContext> context,
                               wgpu::RenderPassColorAttachment m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::RenderPassColorAttachment>(
            context,
            std::make_shared<wgpu::RenderPassColorAttachment>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiRenderPassColorAttachment,
                           RenderPassColorAttachment)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::RenderPassColorAttachment *fromValue(jsi::Runtime &runtime,
                                                    const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiRenderPassColorAttachment>(runtime)
          ->getObject()
          .get();
    } else {
      auto object = new wgpu::RenderPassColorAttachment();
      object->setDefault();
      object->resolveTarget = nullptr;
      object->depthSlice = UINT32_MAX;
      if (obj.hasProperty(runtime, "view")) {
        auto view = obj.getProperty(runtime, "view");

        object->view = *JsiTextureView::fromValue(runtime, view);
      } else {
        throw jsi::JSError(
            runtime,
            "Missing mandatory prop view in RenderPassColorAttachment");
      }
      if (obj.hasProperty(runtime, "clearValue")) {
        auto clearValue = obj.getProperty(runtime, "clearValue");

        object->clearValue = *JsiColor::fromValue(runtime, clearValue);
      } else {
        throw jsi::JSError(
            runtime,
            "Missing mandatory prop clearValue in RenderPassColorAttachment");
      }
      if (obj.hasProperty(runtime, "loadOp")) {
        auto loadOp = obj.getProperty(runtime, "loadOp");

        object->loadOp =
            getLoadOp(loadOp.getString(runtime).utf8(runtime).c_str());
      } else {
        throw jsi::JSError(
            runtime,
            "Missing mandatory prop loadOp in RenderPassColorAttachment");
      }
      if (obj.hasProperty(runtime, "storeOp")) {
        auto storeOp = obj.getProperty(runtime, "storeOp");

        object->storeOp =
            getStoreOp(storeOp.getString(runtime).utf8(runtime).c_str());
      } else {
        throw jsi::JSError(
            runtime,
            "Missing mandatory prop storeOp in RenderPassColorAttachment");
      }
      return object;
    }
  }
};
} // namespace RNSkia
