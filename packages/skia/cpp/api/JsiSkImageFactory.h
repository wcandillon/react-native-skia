#pragma once

#include <memory>
#include <utility>
#include <variant>

#include <jsi/jsi.h>

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

  // A native buffer crosses the package boundary as a raw pointer (BigInt):
  // an IOSurfaceRef or CVPixelBufferRef on Apple platforms, an AHardwareBuffer*
  // on Android. That is what react-native-webgpu's NativeVideoFrame.handle and
  // VisionCamera's frame.getNativeBuffer().pointer hold. Dawn imports the
  // buffer as shared texture memory and the image samples it without a copy;
  // the caller keeps ownership of the buffer and keeps it alive while the
  // image is in use (see DawnContext::MakeImageFromBuffer).
  std::shared_ptr<JsiSkImage> MakeImageFromNativeBuffer(void *rawPointer) {
    auto image = DawnContext::getInstance().MakeImageFromBuffer(rawPointer);
    if (image == nullptr) {
      throw std::runtime_error(
          "MakeImageFromNativeBuffer: failed to wrap the buffer");
    }
    return std::make_shared<JsiSkImage>(getContext(), std::move(image));
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
                  promise->resolve(
                      makeJsiObject(runtime, std::make_shared<JsiSkImage>(
                                                 context, std::move(result))));
                });
              });
        });
  }

  // Pointer-based texture interop with react-native-webgpu. The GPUTexture
  // JS objects live in react-native-webgpu, so textures cross the package
  // boundary as raw WGPUTexture pointers (BigInt), exactly like the device
  // handoff (Skia.getNativeDevice / importDevice). Only sound on the shared
  // device: both packages link one Dawn and share one wgpu::Instance.

  JSI_HOST_FUNCTION(MakeImageFromNativeTexture) {
    if (count < 1 || !arguments[0].isBigInt()) {
      throw std::runtime_error("MakeImageFromNativeTexture requires a "
                               "WGPUTexture pointer (BigInt), e.g. "
                               "texture.nativePointer");
    }
    auto raw = reinterpret_cast<WGPUTexture>(
        arguments[0].asBigInt(runtime).asUint64(runtime));
    if (raw == nullptr) {
      throw std::runtime_error(
          "MakeImageFromNativeTexture: pointer must be non-null");
    }
    // Borrow: AddRef so our wgpu::Texture holds its own reference; the
    // wrapped SkImage retains the texture for its lifetime (see
    // DawnContext::MakeImageFromTexture) and the caller keeps ownership of
    // the JS GPUTexture.
    wgpuTextureAddRef(raw);
    wgpu::Texture texture = wgpu::Texture::Acquire(raw);
    auto &dawnContext = DawnContext::getInstance();
    auto image = dawnContext.MakeImageFromTexture(
        texture, static_cast<int>(texture.GetWidth()),
        static_cast<int>(texture.GetHeight()), texture.GetFormat());
    if (image == nullptr) {
      throw std::runtime_error(
          "MakeImageFromNativeTexture: failed to wrap the texture");
    }
    return makeJsiObject(
        runtime, std::make_shared<JsiSkImage>(getContext(), std::move(image)));
  }

  JSI_HOST_FUNCTION(MakeNativeTextureFromImage) {
    if (count < 1) {
      throw std::runtime_error(
          "MakeNativeTextureFromImage requires an SkImage argument");
    }
    auto image = JsiSkImage::fromValue(runtime, arguments[0]);
    if (!image) {
      throw std::runtime_error("Invalid SkImage object");
    }
    auto &dawnContext = DawnContext::getInstance();
    wgpu::Texture texture = dawnContext.MakeTextureFromImage(image);
    if (!texture) {
      throw std::runtime_error(
          "MakeNativeTextureFromImage: failed to create the texture");
    }
    // Transfer ownership: the returned pointer carries one reference and must
    // be adopted exactly once (react-native-webgpu's adoptTexture()), which
    // releases it when the JS GPUTexture is destroyed.
    return jsi::BigInt::fromUint64(
        runtime, reinterpret_cast<uint64_t>(texture.MoveToCHandle()));
  }

  size_t getMemoryPressure() override { return 1024; }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installMethod(runtime, prototype, "MakeImageFromEncoded",
                  &JsiSkImageFactory::MakeImageFromEncoded);
    installHostMethod(runtime, prototype, "MakeImageFromViewTag",
                      &JsiSkImageFactory::MakeImageFromViewTag);
    installMethod(runtime, prototype, "MakeImageFromNativeBuffer",
                  &JsiSkImageFactory::MakeImageFromNativeBuffer);
    installMethod(runtime, prototype, "MakeImage",
                  &JsiSkImageFactory::MakeImage);
    installMethod(runtime, prototype, "MakeNull", &JsiSkImageFactory::MakeNull);
    installHostMethod(runtime, prototype, "MakeImageFromNativeTexture",
                      &JsiSkImageFactory::MakeImageFromNativeTexture);
    installHostMethod(runtime, prototype, "MakeNativeTextureFromImage",
                      &JsiSkImageFactory::MakeNativeTextureFromImage);
  }

  explicit JsiSkImageFactory(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkNativeObject<JsiSkImageFactory>(std::move(context)) {}
};

} // namespace RNSkia
