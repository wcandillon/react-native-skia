#pragma once

#include <memory>
#include <utility>
#include <variant>

#include <jsi/jsi.h>

#include "JsiGPUTexture.h"
#include "JsiSkConverters.h"
#include "JsiSkData.h"
#include "JsiSkImage.h"
#include "JsiSkImageInfo.h"
#include "JsiSkNativeObjects.h"
#include "jsi/JsiPromises.h"

#include "rnskia/RNDawnContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkImageFactory : public JsiSkNativeObject<JsiSkImageFactory> {
public:
  static constexpr const char *CLASS_NAME = "ImageFactory";

  std::shared_ptr<JsiSkImage> MakeNull() {
    return std::make_shared<JsiSkImage>(getContext(), nullptr);
  }

  std::variant<std::nullptr_t, std::shared_ptr<JsiSkImage>>
  MakeImageFromEncoded(sk_sp<SkData> data) {
    auto image = SkImages::DeferredFromEncodedData(data);
    if (image == nullptr) {
      return nullptr;
    }
    return std::make_shared<JsiSkImage>(getContext(), std::move(image));
  }

  // Native buffers (camera and video frames) are not imported by Skia: they
  // are rendered into a texture of the shared device by react-native-webgpu,
  // and the texture is wrapped with MakeImageFromGPUTexture. The method
  // only exists on Web, where it draws a CanvasImageSource; on native it
  // points callers at the texture path.
  JSI_HOST_FUNCTION(MakeImageFromNativeBuffer) {
    throw std::runtime_error(
        "MakeImageFromNativeBuffer is only available on Web. On native "
        "platforms, copy the frame into a texture with react-native-webgpu's "
        "queue.copyExternalImageToTexture() and wrap the texture with "
        "Skia.Image.MakeImageFromGPUTexture()");
  }

  std::variant<std::nullptr_t, std::shared_ptr<JsiSkImage>>
  MakeImage(std::shared_ptr<SkImageInfo> imageInfo, sk_sp<SkData> pixelData,
            double bytesPerRow) {
    auto image = SkImages::RasterFromData(*imageInfo, pixelData, bytesPerRow);
    if (image == nullptr) {
      return nullptr;
    }
    return std::make_shared<JsiSkImage>(getContext(), std::move(image));
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
              viewTag, [context = std::move(context),
                        promise = std::move(promise)](sk_sp<SkImage> image) {
                // The runtime the result is delivered on, not the one the
                // screenshot started on: a reload may have destroyed it.
                context->runOnJavascriptThread(
                    [context = std::move(context), promise = std::move(promise),
                     result = std::move(image)](jsi::Runtime &runtime) {
                      if (result == nullptr) {
                        promise->reject("Failed to create image from view tag");
                        return;
                      }
                      promise->resolve(makeJsiObject(
                          runtime, std::make_shared<JsiSkImage>(
                                       context, std::move(result))));
                    });
              });
        });
  }

  // Texture interop with react-native-webgpu. Both packages link one Dawn and
  // share one device, so a GPUTexture created on the shared device
  // (importDevice(Skia.getNativeDevice())) can be wrapped as is. The texture
  // crosses the package boundary through its nativePointer (see
  // JsiGPUTexture.h); the device handoff works the same way.

  JSI_HOST_FUNCTION(MakeImageFromGPUTexture) {
    if (count < 1) {
      throw std::runtime_error(
          "MakeImageFromGPUTexture requires a GPUTexture argument");
    }
    // The wrapped SkImage retains the texture for its lifetime (see
    // DawnContext::MakeImageFromTexture) and the caller keeps ownership of
    // the JS GPUTexture.
    wgpu::Texture texture =
        gpuTextureFromValue(runtime, arguments[0], "MakeImageFromGPUTexture");
    auto &dawnContext = DawnContext::getInstance();
    auto image = dawnContext.MakeImageFromTexture(
        texture, static_cast<int>(texture.GetWidth()),
        static_cast<int>(texture.GetHeight()), texture.GetFormat());
    if (image == nullptr) {
      throw std::runtime_error(
          "MakeImageFromGPUTexture: failed to wrap the texture");
    }
    return makeJsiObject(
        runtime, std::make_shared<JsiSkImage>(getContext(), std::move(image)));
  }

  JSI_HOST_FUNCTION(MakeGPUTextureFromImage) {
    if (count < 1) {
      throw std::runtime_error(
          "MakeGPUTextureFromImage requires an SkImage argument");
    }
    auto image = JsiSkImage::fromValue(runtime, arguments[0]);
    if (!image) {
      throw std::runtime_error("Invalid SkImage object");
    }
    auto &dawnContext = DawnContext::getInstance();
    wgpu::Texture texture = dawnContext.MakeTextureFromImage(image);
    if (!texture) {
      throw std::runtime_error(
          "MakeGPUTextureFromImage: failed to create the texture");
    }
    // Transfer ownership: the returned pointer carries one reference and must
    // be adopted exactly once (react-native-webgpu's adoptTexture()), which
    // releases it when the JS GPUTexture is destroyed. Only react-native-webgpu
    // can build the typed GPUTexture object, which is why this returns a
    // pointer while MakeImageFromGPUTexture takes the object.
    return jsi::BigInt::fromUint64(
        runtime, reinterpret_cast<uint64_t>(texture.MoveToCHandle()));
  }

  size_t getMemoryPressure() override { return 1024; }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installMethod(runtime, prototype, "MakeImageFromEncoded",
                  &JsiSkImageFactory::MakeImageFromEncoded);
    installHostMethod(runtime, prototype, "MakeImageFromViewTag",
                      &JsiSkImageFactory::MakeImageFromViewTag);
    installHostMethod(runtime, prototype, "MakeImageFromNativeBuffer",
                      &JsiSkImageFactory::MakeImageFromNativeBuffer);
    installMethod(runtime, prototype, "MakeImage",
                  &JsiSkImageFactory::MakeImage);
    installMethod(runtime, prototype, "MakeNull", &JsiSkImageFactory::MakeNull);
    installHostMethod(runtime, prototype, "MakeImageFromGPUTexture",
                      &JsiSkImageFactory::MakeImageFromGPUTexture);
    installHostMethod(runtime, prototype, "MakeGPUTextureFromImage",
                      &JsiSkImageFactory::MakeGPUTextureFromImage);
  }

  explicit JsiSkImageFactory(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkNativeObject<JsiSkImageFactory>(std::move(context)) {}
};

} // namespace RNSkia
