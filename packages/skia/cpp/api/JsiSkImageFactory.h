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
#include "SkiaErrors.h"

#include "rnskia/RNDawnContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkImageFactory : public JsiSkNativeObject<JsiSkImageFactory> {
public:
  static constexpr const char *CLASS_NAME = "ImageFactory";

  std::shared_ptr<JsiSkImage> MakeNull() {
    return std::make_shared<JsiSkImage>(getContext(), nullptr);
  }

  std::shared_ptr<JsiSkImage> MakeFromEncoded(sk_sp<SkData> data) {
    auto image = SkImages::DeferredFromEncodedData(data);
    if (image == nullptr) {
      throw SkiaErrors::decode("Image.MakeFromEncoded: the data is not an "
                               "image format Skia can decode",
                               "image");
    }
    return std::make_shared<JsiSkImage>(getContext(), std::move(image));
  }

  // Native buffers (camera and video frames) are not imported by Skia: they
  // are rendered into a texture of the shared device by react-native-webgpu,
  // and the texture is wrapped with MakeFromGPUTexture. The method
  // only exists on Web, where it draws a CanvasImageSource; on native it
  // points callers at the texture path.
  JSI_HOST_FUNCTION(MakeFromNativeBuffer) {
    throw SkiaErrors::notSupported(
        "MakeFromNativeBuffer is only available on Web. On native "
        "platforms, copy the frame into a texture with react-native-webgpu's "
        "queue.copyExternalImageToTexture() and wrap the texture with "
        "Skia.Image.MakeFromGPUTexture()");
  }

  // A raster (CPU) image holding a copy of the pixels.
  std::shared_ptr<JsiSkImage> MakeRaster(std::shared_ptr<SkImageInfo> imageInfo,
                                         sk_sp<SkData> pixelData,
                                         double bytesPerRow) {
    auto image = SkImages::RasterFromData(*imageInfo, pixelData, bytesPerRow);
    if (image == nullptr) {
      throw SkiaErrors::validation(
          "Image.MakeRaster: the image info is invalid, or bytesPerRow is "
          "less than a row of pixels, or the data is shorter than "
          "bytesPerRow * height");
    }
    return std::make_shared<JsiSkImage>(getContext(), std::move(image));
  }

  // Texture interop with react-native-webgpu. Both packages link one Dawn and
  // share one device, so a GPUTexture created on the shared device
  // (importDevice(Skia.getNativeDevice())) can be wrapped as is. The texture
  // crosses the package boundary through its nativePointer (see
  // JsiGPUTexture.h); the device handoff works the same way.

  // Like a WebGPU device's createView(), it never fails for a lost device:
  // the image is a dead one then (see JsiSkImage::makeDead).
  JSI_HOST_FUNCTION(MakeFromGPUTexture) {
    if (count < 1) {
      throw SkiaErrors::typeError(
          "MakeFromGPUTexture requires a GPUTexture argument");
    }
    // The wrapped SkImage retains the texture for its lifetime (see
    // DawnContext::MakeImageFromTexture) and the caller keeps ownership of
    // the JS GPUTexture.
    wgpu::Texture texture =
        gpuTextureFromValue(runtime, arguments[0], "MakeFromGPUTexture");
    auto *dawn = DawnContext::tryGetInstance();
    if (dawn == nullptr) {
      throw SkiaErrors::gpuUnavailable(DawnContext::getGpuInfo().error);
    }
    auto width = static_cast<int>(texture.GetWidth());
    auto height = static_cast<int>(texture.GetHeight());
    if (DawnContext::isDeviceLost()) {
      return makeJsiObject(
          runtime, JsiSkImage::makeDead(getContext(), width, height, 0));
    }
    if (!(texture.GetUsage() & wgpu::TextureUsage::TextureBinding)) {
      throw SkiaErrors::validation(
          "MakeFromGPUTexture: the texture needs the TEXTURE_BINDING usage");
    }
    auto image =
        dawn->MakeImageFromTexture(texture, width, height, texture.GetFormat());
    if (image == nullptr) {
      if (DawnContext::isDeviceLost()) {
        return makeJsiObject(
            runtime, JsiSkImage::makeDead(getContext(), width, height, 0));
      }
      throw SkiaErrors::validation(
          "MakeFromGPUTexture: the texture cannot be sampled: it must be made "
          "on the shared device, in a format Skia samples");
    }
    return makeJsiObject(
        runtime, std::make_shared<JsiSkImage>(getContext(), std::move(image)));
  }

  // Like a WebGPU device's createTexture(), the texture of a lost device is
  // made all the same: a destroyed GPUTexture once adopted.
  JSI_HOST_FUNCTION(MakeGPUTextureFromImage) {
    if (count < 1) {
      throw SkiaErrors::typeError(
          "MakeGPUTextureFromImage requires an SkImage argument");
    }
    auto image = JsiSkImage::fromValue(runtime, arguments[0]);
    if (!image) {
      throw SkiaErrors::typeError(
          "MakeGPUTextureFromImage requires an SkImage argument");
    }
    auto *dawn = DawnContext::tryGetInstance();
    if (dawn == nullptr) {
      throw SkiaErrors::gpuUnavailable(DawnContext::getGpuInfo().error);
    }
    wgpu::Texture texture = dawn->MakeTextureFromImage(image);
    if (!texture) {
      throw SkiaErrors::outOfMemory(
          "MakeGPUTextureFromImage: no GPU memory for the texture");
    }
    // Transfer ownership: the returned pointer carries one reference and must
    // be adopted exactly once (react-native-webgpu's adoptTexture()), which
    // releases it when the JS GPUTexture is destroyed. Only react-native-webgpu
    // can build the typed GPUTexture object, which is why this returns a
    // pointer while MakeFromGPUTexture takes the object.
    return jsi::BigInt::fromUint64(
        runtime, reinterpret_cast<uint64_t>(texture.MoveToCHandle()));
  }

  size_t getMemoryPressure() override { return 1024; }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installMethod(runtime, prototype, "MakeFromEncoded",
                  &JsiSkImageFactory::MakeFromEncoded);
    installHostMethod(runtime, prototype, "MakeFromNativeBuffer",
                      &JsiSkImageFactory::MakeFromNativeBuffer);
    installMethod(runtime, prototype, "MakeRaster",
                  &JsiSkImageFactory::MakeRaster);
    installMethod(runtime, prototype, "MakeNull", &JsiSkImageFactory::MakeNull);
    installHostMethod(runtime, prototype, "MakeFromGPUTexture",
                      &JsiSkImageFactory::MakeFromGPUTexture);
    installHostMethod(runtime, prototype, "MakeGPUTextureFromImage",
                      &JsiSkImageFactory::MakeGPUTextureFromImage);
  }

  explicit JsiSkImageFactory(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkNativeObject<JsiSkImageFactory>(std::move(context)) {}
};

} // namespace RNSkia
