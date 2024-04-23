#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiSharedTextureMemoryBeginAccessDescriptor.h"
#include "JsiSharedTextureMemoryEndAccessState.h"
#include "JsiSharedTextureMemoryProperties.h"
#include "JsiTexture.h"
#include "JsiTextureDescriptor.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSharedTextureMemory
    : public JsiSkWrappingSharedPtrHostObject<wgpu::SharedTextureMemory> {
public:
  JsiSharedTextureMemory(std::shared_ptr<RNSkPlatformContext> context,
                         wgpu::SharedTextureMemory m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::SharedTextureMemory>(
            context,
            std::make_shared<wgpu::SharedTextureMemory>(std::move(m))) {}

  JSI_HOST_FUNCTION(setLabel) {
    auto label = JsiChar::fromValue(runtime, arguments[0]);
    auto ret = getObject()->setLabel(*label.get());
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(getProperties) {
    auto properties =
        JsiSharedTextureMemoryProperties::fromValue(runtime, arguments[0]);
    auto ret = getObject()->getProperties(*properties.get());
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(createTexture) {
    auto descriptor =
        count > 0 ? JsiTextureDescriptor::fromValue(runtime, arguments[0])
                  : defaultDescriptor;
    auto ret = getObject()->createTexture(*descriptor.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiTexture>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(beginAccess) {
    auto texture = JsiTexture::fromValue(runtime, arguments[0]);
    auto descriptor = JsiSharedTextureMemoryBeginAccessDescriptor::fromValue(
        runtime, arguments[1]);
    auto ret = getObject()->beginAccess(*texture.get(), *descriptor.get());
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(endAccess) {
    auto texture = JsiTexture::fromValue(runtime, arguments[0]);
    auto descriptor =
        JsiSharedTextureMemoryEndAccessState::fromValue(runtime, arguments[1]);
    auto ret = getObject()->endAccess(*texture.get(), *descriptor.get());
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(isDeviceLost) {

    auto ret = getObject()->isDeviceLost();
    return jsi::Value(ret);
  }

  EXPORT_JSI_API_TYPENAME(JsiSharedTextureMemory, SharedTextureMemory)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiSharedTextureMemory, setLabel),
                       JSI_EXPORT_FUNC(JsiSharedTextureMemory, getProperties),
                       JSI_EXPORT_FUNC(JsiSharedTextureMemory, createTexture),
                       JSI_EXPORT_FUNC(JsiSharedTextureMemory, beginAccess),
                       JSI_EXPORT_FUNC(JsiSharedTextureMemory, endAccess),
                       JSI_EXPORT_FUNC(JsiSharedTextureMemory, isDeviceLost))

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::SharedTextureMemory>
  fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiSharedTextureMemory>(runtime)->getObject();
  }
};
} // namespace RNSkia
