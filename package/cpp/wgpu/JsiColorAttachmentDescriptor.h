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
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiColorAttachmentDescriptor
    : public JsiSkWrappingSharedPtrHostObject<wgpu::ColorAttachmentDescriptor> {
public:
  JsiColorAttachmentDescriptor(std::shared_ptr<RNSkPlatformContext> context,
                               wgpu::ColorAttachmentDescriptor m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::ColorAttachmentDescriptor>(
            context,
            std::make_shared<wgpu::ColorAttachmentDescriptor>(std::move(m))) {}

  EXPORT_JSI_API_BRANDNAME(JsiColorAttachmentDescriptor,
                           ColorAttachmentDescriptor)

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::ColorAttachmentDescriptor>
  fromValue(jsi::Runtime &runtime, const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiColorAttachmentDescriptor>(runtime)
          ->getObject();
    } else {
      auto object = std::make_shared<wgpu::ColorAttachmentDescriptor>();
      if (obj.hasProperty(runtime, "view")) {
        auto view = obj.getProperty(runtime, "view");

        object->view = *JsiTextureView::fromValue(runtime, view).get();
      } else {
        throw jsi::JSError(
            runtime,
            "Missing mandatory prop view in ColorAttachmentDescriptor");
      }
      if (obj.hasProperty(runtime, "clearValue")) {
        auto clearValue = obj.getProperty(runtime, "clearValue");

        object->clearValue = *JsiColor::fromValue(runtime, clearValue).get();
      } else {
        throw jsi::JSError(
            runtime,
            "Missing mandatory prop clearValue in ColorAttachmentDescriptor");
      }
      if (obj.hasProperty(runtime, "loadOp")) {
        auto loadOp = obj.getProperty(runtime, "loadOp");

        object->loadOp =
            getLoadOp(loadOp.getString(runtime).utf8(runtime).c_str());
      } else {
        throw jsi::JSError(
            runtime,
            "Missing mandatory prop loadOp in ColorAttachmentDescriptor");
      }
      if (obj.hasProperty(runtime, "storeOp")) {
        auto storeOp = obj.getProperty(runtime, "storeOp");

        object->storeOp =
            getStoreOp(storeOp.getString(runtime).utf8(runtime).c_str());
      } else {
        throw jsi::JSError(
            runtime,
            "Missing mandatory prop storeOp in ColorAttachmentDescriptor");
      }
      return object;
    }
  }
};
} // namespace RNSkia