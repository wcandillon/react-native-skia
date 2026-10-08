#pragma once

#include <memory>
#include <optional>
#include <string>
#include <utility>
#include <variant>

#include "JsiSkConverters.h"
#include "JsiSkImageInfo.h"
#include "JsiSkMatrix.h"
#include "JsiSkNativeObjects.h"
#include "JsiSkShader.h"
#include "api/third_party/base64.h"
#include "jsi/JsiPromises.h"

#include "utils/RNSkTypedArray.h"

#include "include/gpu/graphite/Context.h"
#include "rnskia/RNDawnContext.h"
#include "rnskia/RNSkWorker.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/codec/SkEncodedImageFormat.h"
#include "include/core/SkImage.h"
#include "include/core/SkPixmap.h"
#include "include/core/SkStream.h"
#include "include/encode/SkJpegEncoder.h"
#include "include/encode/SkPngEncoder.h"
#include "include/encode/SkWebpEncoder.h"

#pragma clang diagnostic pop

#include <jsi/jsi.h>

#ifdef __APPLE__
#include <CoreFoundation/CoreFoundation.h>
#include <CoreGraphics/CoreGraphics.h>
#include <cstring>

// Replaces Skia's generated "Display P3 Gamut with sRGB Transfer" (Google/Skia
// copyright) ICC profile in a JPEG with Apple's canonical Display P3 ICC bytes
// from CGColorSpace.displayP3. This is needed because apps like Instagram only
// recognise the canonical Apple profile, not Skia's mathematically equivalent
// but non-standard one. Pixel values are untouched — zero quality loss.
static sk_sp<SkData> replaceJpegICCWithAppleP3(sk_sp<SkData> jpegData) {
  if (!jpegData || jpegData->size() < 4)
    return jpegData;

  const uint8_t *src = jpegData->bytes();
  size_t srcLen = jpegData->size();
  if (src[0] != 0xFF || src[1] != 0xD8)
    return jpegData; // not a JPEG

  CGColorSpaceRef p3 = CGColorSpaceCreateWithName(kCGColorSpaceDisplayP3);
  if (!p3)
    return jpegData;
  CFDataRef cfICC = CGColorSpaceCopyICCData(p3);
  CGColorSpaceRelease(p3);
  if (!cfICC)
    return jpegData;

  const uint8_t *iccBytes = CFDataGetBytePtr(cfICC);
  size_t iccLen = static_cast<size_t>(CFDataGetLength(cfICC));

  // "ICC_PROFILE\0" APP2 marker signature (12 bytes)
  static const uint8_t iccSig[] = {0x49, 0x43, 0x43, 0x5F, 0x50, 0x52,
                                   0x4F, 0x46, 0x49, 0x4C, 0x45, 0x00};

  SkDynamicMemoryWStream out;

  out.write(src, 2); // SOI

  // Structure: marker(2) + length(2) + "ICC_PROFILE\0"(12) + chunk[1,1](2) +
  // profile
  size_t iccContentLen = sizeof(iccSig) + 2 + iccLen;
  size_t segLen = iccContentLen + 2; // length field includes itself
  uint8_t app2hdr[4] = {0xFF, 0xE2, (uint8_t)(segLen >> 8),
                        (uint8_t)(segLen & 0xFF)};
  uint8_t chunkInfo[2] = {0x01, 0x01}; // chunk 1 of 1
  out.write(app2hdr, 4);
  out.write(iccSig, sizeof(iccSig));
  out.write(chunkInfo, 2);
  out.write(iccBytes, iccLen);

  // Copy all header segments except any existing ICC APP2
  size_t i = 2;
  while (i + 3 < srcLen) {
    if (src[i] != 0xFF)
      break;
    uint8_t marker = src[i + 1];
    if (marker == 0xDA || marker == 0xD9)
      break; // SOS / EOI
    size_t segLenVal = (size_t(src[i + 2]) << 8) | src[i + 3];
    size_t end = i + 2 + segLenVal;
    if (end > srcLen)
      break;
    bool isICC = marker == 0xE2 && end > i + 4 + sizeof(iccSig) &&
                 memcmp(src + i + 4, iccSig, sizeof(iccSig)) == 0;
    if (!isICC) {
      out.write(src + i, end - i);
    }
    i = end;
  }

  out.write(src + i, srcLen - i);

  CFRelease(cfICC);
  return out.detachAsData();
}
#endif // __APPLE__

namespace RNSkia {

namespace jsi = facebook::jsi;

inline SkSamplingOptions SamplingOptionsFromValue(jsi::Runtime &runtime,
                                                  const jsi::Value &val) {
  SkSamplingOptions samplingOptions(SkFilterMode::kLinear);
  if (val.isObject()) {
    auto object = val.asObject(runtime);
    if (object.hasProperty(runtime, "B") && object.hasProperty(runtime, "C")) {
      auto B = static_cast<float>(object.getProperty(runtime, "B").asNumber());
      auto C = static_cast<float>(object.getProperty(runtime, "C").asNumber());
      samplingOptions = SkSamplingOptions({B, C});
    } else if (object.hasProperty(runtime, "filter")) {
      auto filter = static_cast<SkFilterMode>(
          object.getProperty(runtime, "filter").asNumber());
      if (object.hasProperty(runtime, "mipmap")) {
        auto mipmap = static_cast<SkMipmapMode>(
            object.getProperty(runtime, "mipmap").asNumber());
        samplingOptions = SkSamplingOptions(filter, mipmap);
      } else {
        samplingOptions = SkSamplingOptions(filter);
      }
    }
  }
  return samplingOptions;
}

class JsiSkImage : public JsiSkWrappingSkPtrNativeObject<JsiSkImage, SkImage> {
public:
  static constexpr const char *CLASS_NAME = "Image";

  // TODO-API: Properties?
  double width() { return static_cast<double>(getObject()->width()); }
  double height() { return static_cast<double>(getObject()->height()); }

  std::shared_ptr<JsiSkImageInfo> getImageInfo() {
    return std::make_shared<JsiSkImageInfo>(getContext(),
                                            getObject()->imageInfo());
  }

  std::shared_ptr<JsiSkShader>
  makeShaderOptions(double tmx, double tmy, double fm, double mm,
                    std::optional<std::shared_ptr<SkMatrix>> m) {
    auto shader = getObject()->makeShader(
        static_cast<SkTileMode>(tmx), static_cast<SkTileMode>(tmy),
        SkSamplingOptions(static_cast<SkFilterMode>(fm),
                          static_cast<SkMipmapMode>(mm)),
        m.has_value() ? m->get() : nullptr);
    return std::make_shared<JsiSkShader>(getContext(), std::move(shader));
  }

  std::shared_ptr<JsiSkShader>
  makeShaderCubic(double tmx, double tmy, double B, double C,
                  std::optional<std::shared_ptr<SkMatrix>> m) {
    auto shader = getObject()->makeShader(
        static_cast<SkTileMode>(tmx), static_cast<SkTileMode>(tmy),
        SkSamplingOptions({SkDoubleToScalar(B), SkDoubleToScalar(C)}),
        m.has_value() ? m->get() : nullptr);
    return std::make_shared<JsiSkShader>(getContext(), std::move(shader));
  }

  sk_sp<SkData> encodeImageData(JsiOptional<double> formatParam,
                                JsiOptional<double> qualityParam) {
    // Get optional parameters
    auto format = formatParam.has_value()
                      ? static_cast<SkEncodedImageFormat>(*formatParam)
                      : SkEncodedImageFormat::kPNG;
    auto quality = qualityParam.has_value() ? *qualityParam : 100.0;
    auto image = DawnContext::getInstance().MakeRasterImage(getObject());
    sk_sp<SkData> data;

    if (format == SkEncodedImageFormat::kJPEG) {
      SkJpegEncoder::Options options;
      options.fQuality = quality;
      data = SkJpegEncoder::Encode(nullptr, image.get(), options);
#ifdef __APPLE__
      // Replace Skia's generated ICC with Apple's canonical Display P3 profile
      // so apps like Instagram recognise the wide-gamut colour space.
      if (data && image->colorSpace() && !image->colorSpace()->isSRGB()) {
        data = replaceJpegICCWithAppleP3(data);
      }
#endif
    } else if (format == SkEncodedImageFormat::kWEBP) {
      SkWebpEncoder::Options options;
      if (quality >= 100) {
        options.fCompression = SkWebpEncoder::Compression::kLossless;
        options.fQuality = 75; // This is effort to compress
      } else {
        options.fCompression = SkWebpEncoder::Compression::kLossy;
        options.fQuality = quality;
      }
      data = SkWebpEncoder::Encode(nullptr, image.get(), options);
    } else {
      SkPngEncoder::Options options;
      data = SkPngEncoder::Encode(nullptr, image.get(), options);
    }

    return data;
  }

  // Stays raw: constructs a Uint8Array result.
  JSI_HOST_FUNCTION(encodeToBytes) {
    JsiOptional<double> format =
        count >= 1 && !arguments[0].isUndefined() && !arguments[0].isNull()
            ? JsiOptional<double>(arguments[0].asNumber())
            : JsiOptional<double>();
    JsiOptional<double> quality =
        count >= 2 && arguments[1].isNumber()
            ? JsiOptional<double>(arguments[1].asNumber())
            : JsiOptional<double>();
    auto data = encodeImageData(format, quality);
    if (!data) {
      return jsi::Value::null();
    }

    auto arrayCtor =
        runtime.global().getPropertyAsFunction(runtime, "Uint8Array");
    size_t size = data->size();

    jsi::Object array =
        arrayCtor.callAsConstructor(runtime, static_cast<double>(size))
            .getObject(runtime);
    jsi::ArrayBuffer buffer =
        array.getProperty(runtime, jsi::PropNameID::forAscii(runtime, "buffer"))
            .asObject(runtime)
            .getArrayBuffer(runtime);

    auto bfrPtr = reinterpret_cast<uint8_t *>(buffer.data(runtime));
    memcpy(bfrPtr, data->bytes(), size);
    return array;
  }

  std::variant<std::nullptr_t, std::string>
  encodeToBase64(JsiOptional<double> format, JsiOptional<double> quality) {
    auto data = encodeImageData(format, quality);
    if (!data) {
      return nullptr;
    }

    auto len = Base64::Encode(data->bytes(), data->size(), nullptr);
    auto buffer = std::string(len, 0);
    Base64::Encode(data->bytes(), data->size(),
                   reinterpret_cast<void *>(&buffer[0]));
    return buffer;
  }

  JSI_HOST_FUNCTION(readPixels) {
    int srcX = 0;
    int srcY = 0;
    if (count > 0 && !arguments[0].isUndefined()) {
      srcX = static_cast<int>(arguments[0].asNumber());
    }
    if (count > 1 && !arguments[1].isUndefined()) {
      srcY = static_cast<int>(arguments[1].asNumber());
    }
    SkImageInfo info =
        (count > 2 && !arguments[2].isUndefined())
            ? *JsiSkImageInfo::fromValue(runtime, arguments[2])
            : SkImageInfo::MakeN32(getObject()->width(), getObject()->height(),
                                   getObject()->imageInfo().alphaType());
    size_t bytesPerRow = 0;
    if (count > 4 && !arguments[4].isUndefined()) {
      bytesPerRow = static_cast<size_t>(arguments[4].asNumber());
    } else {
      bytesPerRow = info.minRowBytes();
    }
    auto dest =
        count > 3
            ? RNSkTypedArray::getTypedArray(runtime, arguments[3], info)
            : RNSkTypedArray::getTypedArray(runtime, jsi::Value::null(), info);
    if (!dest.isObject()) {
      return jsi::Value::null();
    }
    jsi::ArrayBuffer buffer =
        dest.asObject(runtime)
            .getProperty(runtime, jsi::PropNameID::forAscii(runtime, "buffer"))
            .asObject(runtime)
            .getArrayBuffer(runtime);
    auto bfrPtr = reinterpret_cast<void *>(buffer.data(runtime));
    if (!readPixelsInto(getObject(), info, bfrPtr, bytesPerRow, srcX, srcY)) {
      return jsi::Value::null();
    }
    return dest;
  }

  /**
   Reads the pixels of `image` under `dstInfo` at (srcX, srcY) into `dst`,
   converting them to the requested color and alpha types. A raster or lazy
   image is read on the CPU (decoded if needed). A Graphite image is read
   back from the GPU, only the requested rectangle, and the caller waits for
   the GPU; see makeRasterImage() to read back without waiting.
   */
  static bool readPixelsInto(const sk_sp<SkImage> &image,
                             const SkImageInfo &dstInfo, void *dst,
                             size_t rowBytes, int srcX, int srcY) {
    if (!image->isTextureBacked()) {
      return image->readPixels(nullptr, dstInfo, dst, rowBytes, srcX, srcY);
    }
    // Like SkImage::readPixels(), only the part of the rectangle inside the
    // image is read, into the matching part of `dst`.
    auto srcRect =
        SkIRect::MakeXYWH(srcX, srcY, dstInfo.width(), dstInfo.height());
    if (!srcRect.intersect(image->bounds())) {
      return false;
    }
    SkPixmap dstPixels(dstInfo, dst, rowBytes);
    SkPixmap dstSubset;
    if (!dstPixels.extractSubset(&dstSubset,
                                 srcRect.makeOffset(-srcX, -srcY))) {
      return false;
    }
    auto result = DawnContext::getInstance().readPixelsSync(image, srcRect);
    if (result == nullptr) {
      return false;
    }
    SkPixmap pixels(image->imageInfo().makeDimensions(srcRect.size()),
                    result->data(0), result->rowBytes(0));
    return pixels.readPixels(dstSubset);
  }

  // A GPU image: uploaded now, on the calling thread, and drawn by every
  // canvas afterwards without the upload per canvas a raster image gets.
  // Options: { mipmapped?: boolean }.
  JSI_HOST_FUNCTION(makeTextureImage) {
    bool mipmapped = false;
    if (count > 0 && arguments[0].isObject()) {
      auto value =
          arguments[0].asObject(runtime).getProperty(runtime, "mipmapped");
      mipmapped = value.isBool() && value.getBool();
    }
    auto image = getObject();
    auto texture =
        DawnContext::getInstance().MakeTextureImage(image, mipmapped);
    if (texture == nullptr) {
      throw jsi::JSError(runtime,
                         "makeTextureImage: uploading the image failed");
    }
    if (texture == image) {
      return jsi::Value(runtime, thisValue);
    }
    return makeJsiObject(runtime, std::make_shared<JsiSkImage>(
                                      getContext(), std::move(texture)));
  }

  std::variant<std::nullptr_t, std::shared_ptr<JsiSkImage>>
  makeNonTextureImage() {
    auto rasterImage = DawnContext::getInstance().MakeRasterImage(getObject());
    if (!rasterImage) {
      return nullptr;
    }
    return std::make_shared<JsiSkImage>(getContext(), std::move(rasterImage));
  }

  // A CPU image, resolved without blocking: a Graphite image is read back
  // from the GPU and the result delivered by the readback poller, an encoded
  // image is decoded on the worker thread. The promise resolves on the JS
  // thread, so this is for the JS thread; a worklet uses
  // makeNonTextureImage().
  JSI_HOST_FUNCTION(makeRasterImage) {
    auto image = getObject();
    auto context = getContext();
    return RNJsi::JsiPromises::createPromiseAsJSIValue(
        runtime, [&thisValue, image, context = std::move(context)](
                     jsi::Runtime &runtime,
                     std::shared_ptr<RNJsi::JsiPromises::Promise> promise) {
          if (!image->isTextureBacked() && !image->isLazyGenerated()) {
            // The executor runs synchronously: thisValue is still valid.
            promise->resolve(jsi::Value(runtime, thisValue));
            return;
          }
          // The runtime is the one handed to the job, not this one: a
          // reload may destroy this one before the result is ready.
          auto deliver = [context, promise](sk_sp<SkImage> raster) {
            context->runOnJavascriptThread(
                [context, promise,
                 raster = std::move(raster)](jsi::Runtime &runtime) {
                  if (raster == nullptr) {
                    promise->reject(
                        "makeRasterImage: reading the image back failed");
                    return;
                  }
                  promise->resolve(makeJsiObject(
                      runtime, std::make_shared<JsiSkImage>(context, raster)));
                });
          };
          if (image->isTextureBacked()) {
            DawnContext::getInstance().readPixels(
                image, image->bounds(), [image, deliver](ReadResult result) {
                  deliver(DawnContext::MakeRasterImage(image->imageInfo(),
                                                       std::move(result)));
                });
          } else {
            RNSkWorker::getInstance().post([image, deliver]() {
              deliver(image->makeRasterImage(nullptr));
            });
          }
        });
  }

  bool isTextureBacked() { return getObject()->isTextureBacked(); }

  /**
    Returns the underlying object from a host object of this type
   */
  static sk_sp<SkImage> fromValue(jsi::Runtime &runtime,
                                  const jsi::Value &obj) {
    return objectFromValue(runtime, obj);
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    installMethod(runtime, prototype, "width", &JsiSkImage::width);
    installMethod(runtime, prototype, "height", &JsiSkImage::height);
    installMethod(runtime, prototype, "getImageInfo",
                  &JsiSkImage::getImageInfo);
    installMethod(runtime, prototype, "makeShaderOptions",
                  &JsiSkImage::makeShaderOptions);
    installMethod(runtime, prototype, "makeShaderCubic",
                  &JsiSkImage::makeShaderCubic);
    installHostMethod(runtime, prototype, "encodeToBytes",
                      &JsiSkImage::encodeToBytes);
    installMethod(runtime, prototype, "encodeToBase64",
                  &JsiSkImage::encodeToBase64);
    installHostMethod(runtime, prototype, "readPixels",
                      &JsiSkImage::readPixels);
    installMethod(runtime, prototype, "makeNonTextureImage",
                  &JsiSkImage::makeNonTextureImage);
    installHostMethod(runtime, prototype, "makeRasterImage",
                      &JsiSkImage::makeRasterImage);
    installHostMethod(runtime, prototype, "makeTextureImage",
                      &JsiSkImage::makeTextureImage);
    installMethod(runtime, prototype, "isTextureBacked",
                  &JsiSkImage::isTextureBacked);
  }

  /**
   `sharesTexture`: the image is a view of a texture someone else owns (see
   surface.asImage()), which that owner already reports as its memory.
   */
  JsiSkImage(std::shared_ptr<RNSkPlatformContext> context, sk_sp<SkImage> image,
             bool sharesTexture = false)
      : JsiSkWrappingSkPtrNativeObject<JsiSkImage, SkImage>(std::move(context),
                                                            std::move(image)),
        _sharesTexture(sharesTexture) {}

  size_t getMemoryPressure() override {
    if (isDisposed()) {
      return 0;
    }
    auto image = getObjectUnchecked();
    if (image) {
      if (image->isTextureBacked()) {
        return _sharesTexture ? 0 : image->textureSize();
      }
      if (image->isLazyGenerated()) {
        // Still encoded: what it holds is the file, not the decoded pixels.
        if (auto encoded = image->refEncodedData()) {
          return encoded->size();
        }
      }
      return image->imageInfo().computeMinByteSize();
    }
    return 0;
  }

private:
  bool _sharesTexture;
};

} // namespace RNSkia
