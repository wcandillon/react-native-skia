#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiPromises.h"
#include "JsiSkData.h"
#include "JsiSkHostObjects.h"
#include "JsiSkImage.h"
#include "JsiSkImageInfo.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkImageFactory : public JsiSkHostObject {
public:
  JSI_HOST_FUNCTION(MakeImageFromEncoded) {
    auto data = JsiSkData::fromValue(runtime, arguments[0]);
    auto image = SkImages::DeferredFromEncodedData(data);
    if (image == nullptr) {
      return jsi::Value::null();
    }
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiSkImage>(getContext(), std::move(image)));
  }

  JSI_HOST_FUNCTION(MakeImageFromNativeBuffer) {
    jsi::BigInt pointer = arguments[0].asBigInt(runtime);
    const uintptr_t nativeBufferPointer = pointer.asUint64(runtime);
    void *rawPointer = reinterpret_cast<void *>(nativeBufferPointer);
    auto image = getContext()->makeImageFromNativeBuffer(rawPointer);
    if (image == nullptr) {
      throw std::runtime_error("Failed to convert NativeBuffer to SkImage!");
    }
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiSkImage>(getContext(), std::move(image)));
  }

  JSI_HOST_FUNCTION(MakeImage) {
    auto imageInfo = JsiSkImageInfo::fromValue(runtime, arguments[0]);
    auto pixelData = JsiSkData::fromValue(runtime, arguments[1]);
    auto bytesPerRow = arguments[2].asNumber();
    auto image = SkImages::RasterFromData(*imageInfo, pixelData, bytesPerRow);
    if (image == nullptr) {
      return jsi::Value::null();
    }
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiSkImage>(getContext(), std::move(image)));
  }

  JSI_HOST_FUNCTION(MakeImageFromViewTag) {
    auto viewTag = arguments[0].asNumber();
    auto context = getContext();
    return RNJsi::JsiPromises::createPromiseAsJSIValue(
        runtime,
        [context = std::move(context), viewTag](
            jsi::Runtime &runtime,
            std::shared_ptr<RNJsi::JsiPromises::Promise> promise) -> void {
          context->makeViewScreenshot(
              viewTag, [&runtime, context = std::move(context),
                        promise = std::move(promise)](sk_sp<SkImage> image) {
                context->runOnJavascriptThread([&runtime,
                                                context = std::move(context),
                                                promise = std::move(promise),
                                                result = std::move(image)]() {
                  if (result == nullptr) {
                    promise->reject("Failed to create image from view tag");
                    return;
                  }
                  promise->resolve(jsi::Object::createFromHostObject(
                      runtime, std::make_shared<JsiSkImage>(
                                   std::move(context), std::move(result))));
                });
              });
        });
  }

  JSI_HOST_FUNCTION(MakeImageFromNativeTextureUnstable) {
    auto texInfo = JsiTextureInfo::fromValue(runtime, arguments[0]);
    auto image = getContext()->makeImageFromNativeTexture(
        texInfo, arguments[1].asNumber(), arguments[2].asNumber(),
        count > 3 && arguments[3].asBool());
    if (image == nullptr) {
      throw std::runtime_error("Failed to convert native texture to SkImage!");
    }
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiSkImage>(getContext(), std::move(image)));
  }

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiSkImageFactory, MakeImageFromEncoded),
                       JSI_EXPORT_FUNC(JsiSkImageFactory, MakeImageFromViewTag),
                       JSI_EXPORT_FUNC(JsiSkImageFactory,
                                       MakeImageFromNativeBuffer),
                       JSI_EXPORT_FUNC(JsiSkImageFactory,
                                       MakeImageFromNativeTextureUnstable),
                       JSI_EXPORT_FUNC(JsiSkImageFactory, MakeImage))

  explicit JsiSkImageFactory(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkHostObject(std::move(context)) {}
};

} // namespace RNSkia
