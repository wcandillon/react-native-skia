#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

#include "JsiTextureView.h"
#include "JsiTextureViewDescriptor.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiTexture : public JsiSkWrappingSharedPtrHostObject<wgpu::Texture> {
public:
  JsiTexture(std::shared_ptr<RNSkPlatformContext> context, wgpu::Texture m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::Texture>(
            context, std::make_shared<wgpu::Texture>(std::move(m))) {}

  JSI_HOST_FUNCTION(createView) {
    auto descriptor =
        count > 0 ? JsiTextureViewDescriptor::fromValue(runtime, arguments[0])
                  : defaultDescriptor;
    auto ret = getObject()->createView(*descriptor.get());
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiTextureView>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(setLabel) {
    auto label = JsiChar::fromValue(runtime, arguments[0]);
    auto ret = getObject()->setLabel(*label.get());
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(getWidth) {

    auto ret = getObject()->getWidth();
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(getHeight) {

    auto ret = getObject()->getHeight();
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(getDepthOrArrayLayers) {

    auto ret = getObject()->getDepthOrArrayLayers();
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(getMipLevelCount) {

    auto ret = getObject()->getMipLevelCount();
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(getSampleCount) {

    auto ret = getObject()->getSampleCount();
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(getDimension) {

    auto ret = getObject()->getDimension();
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiTextureDimension>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(getFormat) {

    auto ret = getObject()->getFormat();
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiTextureFormat>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(getUsage) {

    auto ret = getObject()->getUsage();
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiTextureUsage>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(destroy) {

    getObject()->destroy();
    return jsi::Value::undefined();
  }

  EXPORT_JSI_API_TYPENAME(JsiTexture, Texture)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiTexture, createView),
                       JSI_EXPORT_FUNC(JsiTexture, setLabel),
                       JSI_EXPORT_FUNC(JsiTexture, getWidth),
                       JSI_EXPORT_FUNC(JsiTexture, getHeight),
                       JSI_EXPORT_FUNC(JsiTexture, getDepthOrArrayLayers),
                       JSI_EXPORT_FUNC(JsiTexture, getMipLevelCount),
                       JSI_EXPORT_FUNC(JsiTexture, getSampleCount),
                       JSI_EXPORT_FUNC(JsiTexture, getDimension),
                       JSI_EXPORT_FUNC(JsiTexture, getFormat),
                       JSI_EXPORT_FUNC(JsiTexture, getUsage),
                       JSI_EXPORT_FUNC(JsiTexture, destroy))

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::Texture> fromValue(jsi::Runtime &runtime,
                                                  const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiTexture>(runtime)->getObject();
  }
};
} // namespace RNSkia
