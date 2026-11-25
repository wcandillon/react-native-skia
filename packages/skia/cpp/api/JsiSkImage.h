#pragma once

#include <algorithm>
#include <cstdint>
#include <memory>
#include <optional>
#include <string>
#include <utility>

#include "JsiSkConverters.h"
#include "JsiSkImageInfo.h"
#include "JsiSkMatrix.h"
#include "JsiSkNativeObjects.h"
#include "JsiSkShader.h"
#include "SkiaErrors.h"
#include "api/third_party/base64.h"
#include "jsi/JsiPromises.h"
#include "rnskia/RNSkAsync.h"

#include "utils/RNSkTypedArray.h"

#include "include/gpu/graphite/Context.h"
#include "rnskia/RNDawnContext.h"
#include "rnskia/RNSkWorker.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/codec/SkEncodedImageFormat.h"
#include "include/core/SkImage.h"
#include "include/core/SkPictureRecorder.h"
#include "include/core/SkPixmap.h"
#include "include/core/SkStream.h"
#include "include/encode/SkJpegEncoder.h"
#include "include/encode/SkPngEncoder.h"
#include "include/encode/SkWebpEncoder.h"
#include "include/private/SkMalloc.h"

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

  /** Whether encodeImageData() has an encoder for the ImageFormat value. */
  static bool isEncodableFormat(double format) {
    auto value = static_cast<SkEncodedImageFormat>(format);
    return value == SkEncodedImageFormat::kPNG ||
           value == SkEncodedImageFormat::kJPEG ||
           value == SkEncodedImageFormat::kWEBP;
  }

  // Encodes a CPU image (raster, or encoded and decoded here). Runs on the
  // worker thread: nothing of it touches a JS runtime.
  static sk_sp<SkData> encodeImageData(const sk_sp<SkImage> &image,
                                       JsiOptional<double> formatParam,
                                       JsiOptional<double> qualityParam) {
    auto format = formatParam.has_value()
                      ? static_cast<SkEncodedImageFormat>(*formatParam)
                      : SkEncodedImageFormat::kPNG;
    auto quality = qualityParam.has_value() ? *qualityParam : 100.0;
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

  // Readbacks ----------------------------------------------------------------
  //
  // Everything that needs the pixels of an image is asynchronous: a Graphite
  // image is read back from the GPU (DawnContext::readPixels), an encoded
  // image is decoded and every image is encoded on the worker thread, and
  // the promise is settled on the runtime that made it (RNSkAsync). The
  // calling thread never waits for the GPU.

  /**
   Why a GPU readback started on `generation` (DawnContext::generation())
   failed, as the error to reject with: an AbortError when the device was
   lost meanwhile (WebGPU's mapAsync rejects the same way), else a
   SkiaInternalError.
   */
  static RNJsi::NamedError readbackError(const std::string &method,
                                         uint64_t generation) {
    if (generation == 0 || !DawnContext::isCurrent(generation)) {
      return SkiaErrors::abort(method +
                               ": the GPU device was lost before the image "
                               "could be read back");
    }
    return SkiaErrors::internal(method + ": reading the image back failed");
  }

  /** A CPU copy of an image, or why there is none. */
  struct RasterResult {
    sk_sp<SkImage> image;
    std::shared_ptr<RNJsi::NamedError> error;
  };

  /**
   The pixels of `image` on the CPU: the image itself when it already is a
   CPU image (raster, or encoded: it decodes where it is read), else a
   raster copy read back from the GPU. `deliver` runs once, on whichever
   thread the pixels arrive on, with the error to reject with when the
   readback failed.
   */
  static void withRasterImage(sk_sp<SkImage> image, const std::string &method,
                              std::function<void(RasterResult)> deliver) {
    if (!image->isTextureBacked()) {
      deliver({std::move(image), nullptr});
      return;
    }
    auto *context = DawnContext::tryGetInstance();
    if (context == nullptr) {
      deliver({nullptr,
               std::make_shared<RNJsi::NamedError>(SkiaErrors::gpuUnavailable(
                   DawnContext::getGpuInfo().error))});
      return;
    }
    auto generation = DawnContext::generation();
    auto bounds = image->bounds();
    context->readPixels(
        image, bounds,
        [image, method, generation,
         deliver = std::move(deliver)](ReadResult result) {
          auto raster = DawnContext::MakeRasterImage(image->imageInfo(),
                                                     std::move(result));
          if (raster == nullptr) {
            deliver({nullptr, std::make_shared<RNJsi::NamedError>(
                                  readbackError(method, generation))});
            return;
          }
          deliver({std::move(raster), nullptr});
        });
  }

  JsiOptional<double> optionalNumber(const jsi::Value *arguments, size_t count,
                                     size_t index) {
    return count > index && arguments[index].isNumber()
               ? JsiOptional<double>(arguments[index].asNumber())
               : JsiOptional<double>();
  }

  /**
   Encodes the image on the worker thread, read back first when it is on the
   GPU, and settles the promise with `resolve(runtime, promise, data)`;
   rejects it with a SkiaValidationError for a format there is no encoder
   for, with an AbortError when the GPU device is lost before the image is
   read back, and with a SkiaInternalError when the readback or the
   encoding fails.
   */
  jsi::Value
  encodeAsync(jsi::Runtime &runtime, const jsi::Value *arguments, size_t count,
              const char *method,
              std::function<void(jsi::Runtime &, RNSkAsync::Promise &,
                                 const sk_sp<SkData> &)>
                  resolve) {
    auto format = optionalNumber(arguments, count, 0);
    auto quality = optionalNumber(arguments, count, 1);
    auto image = getObject();
    if (isDead()) {
      return deadReadback(runtime, method);
    }
    if (format.has_value() && !isEncodableFormat(*format)) {
      auto error = SkiaErrors::validation(
          std::string(method) +
          ": the format must be ImageFormat.PNG, ImageFormat.JPEG or "
          "ImageFormat.WEBP");
      return RNSkAsync::settled(
          runtime, [error](jsi::Runtime &, RNSkAsync::Promise &promise) {
            promise.reject(error);
          });
    }
    return RNSkAsync::run(
        runtime, getContext(),
        [image, format, quality, method,
         resolve = std::move(resolve)](RNSkAsync::Complete complete) {
          withRasterImage(image, method, [=](RasterResult raster) {
            if (raster.error != nullptr) {
              complete([error = raster.error](jsi::Runtime &,
                                              RNSkAsync::Promise &promise) {
                promise.reject(*error);
              });
              return;
            }
            RNSkWorker::getInstance().post([=]() {
              auto data = encodeImageData(raster.image, format, quality);
              complete([=](jsi::Runtime &runtime, RNSkAsync::Promise &promise) {
                if (data == nullptr) {
                  promise.reject(SkiaErrors::internal(
                      std::string(method) + ": encoding the image failed"));
                  return;
                }
                resolve(runtime, promise, data);
              });
            });
          });
        });
  }

  // Resolves to a Uint8Array of the encoded image.
  JSI_HOST_FUNCTION(encodeToBytes) {
    return encodeAsync(
        runtime, arguments, count, "encodeToBytes",
        [](jsi::Runtime &runtime, RNSkAsync::Promise &promise,
           const sk_sp<SkData> &data) {
          auto arrayCtor =
              runtime.global().getPropertyAsFunction(runtime, "Uint8Array");
          size_t size = data->size();
          jsi::Object array =
              arrayCtor.callAsConstructor(runtime, static_cast<double>(size))
                  .getObject(runtime);
          jsi::ArrayBuffer buffer =
              array
                  .getProperty(runtime,
                               jsi::PropNameID::forAscii(runtime, "buffer"))
                  .asObject(runtime)
                  .getArrayBuffer(runtime);
          memcpy(buffer.data(runtime), data->bytes(), size);
          promise.resolve(std::move(array));
        });
  }

  // Resolves to the encoded image as a base64 string.
  JSI_HOST_FUNCTION(encodeToBase64) {
    return encodeAsync(
        runtime, arguments, count, "encodeToBase64",
        [](jsi::Runtime &runtime, RNSkAsync::Promise &promise,
           const sk_sp<SkData> &data) {
          auto len = Base64::Encode(data->bytes(), data->size(), nullptr);
          auto buffer = std::string(len, 0);
          Base64::Encode(data->bytes(), data->size(),
                         reinterpret_cast<void *>(&buffer[0]));
          promise.resolve(jsi::String::createFromUtf8(runtime, buffer));
        });
  }

  /**
   Zeroed memory for the pixels of `info` at `rowBytes` (zero is what a read
   leaves outside the image); nullptr when there is nothing to read into
   (an empty `info`, an unknown color type) or no memory for it (a size
   that overflows, or more than there is), where SkData's own constructors
   would abort the process.
   */
  static sk_sp<SkData> allocatePixels(const SkImageInfo &info,
                                      size_t rowBytes) {
    if (info.isEmpty() || info.colorType() == kUnknown_SkColorType) {
      return nullptr;
    }
    auto size = info.computeByteSize(rowBytes);
    if (size == 0 || size == SIZE_MAX) {
      return nullptr;
    }
    auto *memory = sk_calloc_canfail(size);
    if (memory == nullptr) {
      return nullptr;
    }
    return SkData::MakeFromMalloc(memory, size);
  }

  /**
   A promise rejected for a read that no pixels can be allocated for: a
   SkiaValidationError for an `info` that describes no pixels (empty, or of
   an unknown color type), a SkiaOutOfMemoryError for one too large.
   */
  static jsi::Value unreadable(jsi::Runtime &runtime, const SkImageInfo &info) {
    auto size =
        std::to_string(info.width()) + "x" + std::to_string(info.height());
    auto error = info.isEmpty() || info.colorType() == kUnknown_SkColorType
                     ? SkiaErrors::validation(
                           "readPixels: the image info describes no pixels (" +
                           size + ", or an unknown color type)")
                     : SkiaErrors::outOfMemory(
                           "readPixels: no memory for the pixels of " + size);
    return RNSkAsync::settled(
        runtime, [error](jsi::Runtime &, RNSkAsync::Promise &promise) {
          promise.reject(error);
        });
  }

  /**
   The settling of a promise with `pixels` under `info`: a typed array of
   the color type of `info` (Float32Array for F32, else Uint8Array), filled
   on the runtime (a JS object cannot be filled from another thread).
   */
  static RNSkAsync::Settle settlePixels(sk_sp<SkData> pixels,
                                        SkImageInfo info) {
    return [pixels = std::move(pixels), info](jsi::Runtime &runtime,
                                              RNSkAsync::Promise &promise) {
      auto dstInfo = info;
      auto array =
          RNSkTypedArray::getTypedArray(runtime, jsi::Value::null(), dstInfo);
      if (!array.isObject()) {
        promise.reject(SkiaErrors::validation(
            "readPixels: no typed array holds pixels of this color type"));
        return;
      }
      jsi::ArrayBuffer buffer =
          array.asObject(runtime)
              .getProperty(runtime,
                           jsi::PropNameID::forAscii(runtime, "buffer"))
              .asObject(runtime)
              .getArrayBuffer(runtime);
      memcpy(buffer.data(runtime), pixels->data(),
             std::min(pixels->size(), buffer.size(runtime)));
      promise.resolve(std::move(array));
    };
  }

  /** The settling of a promise with `error`. */
  static RNSkAsync::Settle settleError(RNJsi::NamedError error) {
    return [error = std::move(error)](jsi::Runtime &,
                                      RNSkAsync::Promise &promise) {
      promise.reject(error);
    };
  }

  /**
   Resolves to the pixels of `image` under `dstInfo` at (srcX, srcY), in a
   typed array of the color type of `dstInfo` (Float32Array for F32, else
   Uint8Array), converted from the image's color and alpha types. Like
   SkImage::readPixels(), the part of the rectangle outside the image is
   left untouched, zero: a rectangle entirely outside of it resolves to
   zeros. Rejects with a SkiaValidationError or a SkiaOutOfMemoryError for
   a `dstInfo` no pixels can be allocated for, with an AbortError when the
   GPU device is lost before the image is read back, with a
   SkiaDecodeError for an encoded image that cannot be decoded, and with a
   SkiaInternalError when the read fails. A CPU image is read on the worker
   thread (decoded if needed). A Graphite image is read back from the GPU,
   only the requested rectangle.
   */
  static jsi::Value readPixelsAsync(
      jsi::Runtime &runtime, std::shared_ptr<RNSkPlatformContext> context,
      sk_sp<SkImage> image, SkImageInfo dstInfo, int srcX, int srcY) {
    auto rowBytes = dstInfo.minRowBytes();
    auto pixels = allocatePixels(dstInfo, rowBytes);
    if (pixels == nullptr) {
      return unreadable(runtime, dstInfo);
    }
    return RNSkAsync::run(
        runtime, std::move(context),
        [image, dstInfo, srcX, srcY, rowBytes,
         pixels](RNSkAsync::Complete complete) {
          auto srcRect =
              SkIRect::MakeXYWH(srcX, srcY, dstInfo.width(), dstInfo.height());
          if (!srcRect.intersect(image->bounds())) {
            // Nothing of the image in the rectangle: all of it stays zero.
            complete(settlePixels(pixels, dstInfo));
            return;
          }
          if (!image->isTextureBacked()) {
            RNSkWorker::getInstance().post([=]() {
              if (image->readPixels(nullptr, dstInfo, pixels->writable_data(),
                                    rowBytes, srcX, srcY)) {
                complete(settlePixels(pixels, dstInfo));
              } else if (image->isLazyGenerated()) {
                complete(settleError(SkiaErrors::decode(
                    "readPixels: the encoded image cannot be decoded",
                    "image")));
              } else {
                complete(settleError(SkiaErrors::internal(
                    "readPixels: the pixels cannot be converted to the "
                    "image info")));
              }
            });
            return;
          }
          auto *dawn = DawnContext::tryGetInstance();
          if (dawn == nullptr) {
            complete(settleError(
                SkiaErrors::gpuUnavailable(DawnContext::getGpuInfo().error)));
            return;
          }
          auto generation = DawnContext::generation();
          dawn->readPixels(image, srcRect, [=](ReadResult result) {
            if (result == nullptr) {
              complete(settleError(readbackError("readPixels", generation)));
              return;
            }
            // The callback runs inside the context lock (see
            // DawnContext::readPixels), which every view's frame waits for:
            // the conversion of the rectangle read, into the matching part
            // of the destination, runs on the worker thread instead.
            auto shared = std::make_shared<ReadResult>(std::move(result));
            RNSkWorker::getInstance().post([=]() {
              SkPixmap source(image->imageInfo().makeDimensions(srcRect.size()),
                              (*shared)->data(0), (*shared)->rowBytes(0));
              SkPixmap destination(dstInfo, pixels->writable_data(), rowBytes);
              SkPixmap subset;
              auto read = destination.extractSubset(
                              &subset, srcRect.makeOffset(-srcX, -srcY)) &&
                          source.readPixels(subset);
              if (read) {
                complete(settlePixels(pixels, dstInfo));
              } else {
                complete(settleError(SkiaErrors::internal(
                    "readPixels: the pixels cannot be converted to the "
                    "image info")));
              }
            });
          });
        });
  }

  JSI_HOST_FUNCTION(readPixels) {
    if (isDead()) {
      return deadReadback(runtime, "readPixels");
    }
    int srcX = 0;
    int srcY = 0;
    if (count > 0 && !arguments[0].isUndefined()) {
      srcX = static_cast<int>(arguments[0].asNumber());
    }
    if (count > 1 && !arguments[1].isUndefined()) {
      srcY = static_cast<int>(arguments[1].asNumber());
    }
    auto image = getObject();
    SkImageInfo info =
        (count > 2 && !arguments[2].isUndefined())
            ? *JsiSkImageInfo::fromValue(runtime, arguments[2])
            : SkImageInfo::MakeN32(image->width(), image->height(),
                                   image->imageInfo().alphaType());
    return readPixelsAsync(runtime, getContext(), std::move(image), info, srcX,
                           srcY);
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
    if (isDead()) {
      // Nothing to upload: it stays the dead image it is.
      return jsi::Value(runtime, thisValue);
    }
    auto *dawn = DawnContext::tryGetInstance();
    if (dawn == nullptr) {
      throw SkiaErrors::gpuUnavailable(DawnContext::getGpuInfo().error);
    }
    if (DawnContext::isDeviceLost()) {
      // Nothing can be uploaded until the device is replaced: the image as
      // it is, which a canvas uploads when it draws it.
      return jsi::Value(runtime, thisValue);
    }
    auto texture = dawn->MakeTextureImage(image, mipmapped);
    if (texture == nullptr) {
      if (DawnContext::isDeviceLost()) {
        return jsi::Value(runtime, thisValue);
      }
      throw SkiaErrors::outOfMemory(
          "makeTextureImage: uploading the image failed");
    }
    if (texture == image) {
      return jsi::Value(runtime, thisValue);
    }
    return makeJsiObject(runtime, std::make_shared<JsiSkImage>(
                                      getContext(), std::move(texture)));
  }

  // Resolves to a CPU image: a Graphite image is read back from the GPU, an
  // encoded image is decoded on the worker thread, and a raster image
  // resolves to itself.
  JSI_HOST_FUNCTION(makeRasterImage) {
    auto image = getObject();
    auto context = getContext();
    if (isDead()) {
      return deadReadback(runtime, "makeRasterImage");
    }
    if (!image->isTextureBacked() && !image->isLazyGenerated()) {
      // Already on the CPU: resolves to itself, right away.
      return RNSkAsync::settled(
          runtime,
          [&thisValue](jsi::Runtime &runtime, RNSkAsync::Promise &promise) {
            promise.resolve(jsi::Value(runtime, thisValue));
          });
    }
    return RNSkAsync::run(
        runtime, context, [image, context](RNSkAsync::Complete complete) {
          auto settle = [context](sk_sp<SkImage> raster) {
            return [context, raster = std::move(raster)](
                       jsi::Runtime &runtime, RNSkAsync::Promise &promise) {
              promise.resolve(makeJsiObject(
                  runtime, std::make_shared<JsiSkImage>(context, raster)));
            };
          };
          if (image->isTextureBacked()) {
            withRasterImage(image, "makeRasterImage", [=](RasterResult raster) {
              if (raster.error != nullptr) {
                complete(settleError(*raster.error));
                return;
              }
              complete(settle(std::move(raster.image)));
            });
          } else {
            RNSkWorker::getInstance().post([=]() {
              auto raster = image->makeRasterImage(nullptr);
              if (raster == nullptr) {
                // An encoded image, whose bytes do not decode.
                complete(settleError(SkiaErrors::decode(
                    "makeRasterImage: the encoded image cannot be decoded",
                    "image")));
                return;
              }
              complete(settle(std::move(raster)));
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
    installHostMethod(runtime, prototype, "encodeToBase64",
                      &JsiSkImage::encodeToBase64);
    installHostMethod(runtime, prototype, "readPixels",
                      &JsiSkImage::readPixels);
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
                                                            image),
        _sharesTexture(sharesTexture), _generation(generationOf(image)) {}

  /**
   An image made on the GPU device of `generation` (see
   DawnContext::generation()), rather than the device in use: the snapshot
   of a surface made before a loss, for instance.
   */
  JsiSkImage(std::shared_ptr<RNSkPlatformContext> context, sk_sp<SkImage> image,
             bool sharesTexture, uint64_t generation)
      : JsiSkWrappingSkPtrNativeObject<JsiSkImage, SkImage>(std::move(context),
                                                            std::move(image)),
        _sharesTexture(sharesTexture), _generation(generation) {}

  /**
   An image of a lost GPU device, like the GPU objects of a lost WebGPU
   device: valid to call, it draws nothing, and its readbacks reject with
   an AbortError. What the GPU factories make while the device is lost (see
   DawnContext::isDeviceLost), in place of throwing.
   */
  static std::shared_ptr<JsiSkImage>
  makeDead(std::shared_ptr<RNSkPlatformContext> context, int width, int height,
           uint64_t generation) {
    return std::make_shared<JsiSkImage>(
        std::move(context), makeEmptyImage(width, height), false,
        generation == 0 ? DawnContext::generation() : generation);
  }

  /**
   An image of the given size that draws nothing: a picture image of an
   empty picture, which holds no pixels until something reads it.
   */
  static sk_sp<SkImage> makeEmptyImage(int width, int height) {
    SkPictureRecorder recorder;
    recorder.beginRecording(SkRect::MakeEmpty());
    return SkImages::DeferredFromPicture(
        recorder.finishRecordingAsPicture(),
        SkISize::Make(std::max(width, 1), std::max(height, 1)), nullptr,
        nullptr, SkImages::BitDepth::kU8, SkColorSpace::MakeSRGB());
  }

  /**
   The GPU device a GPU image belongs to (see DawnContext::generation());
   0 for a CPU image, which belongs to none.
   */
  static uint64_t generationOf(const sk_sp<SkImage> &image) {
    return image != nullptr && image->isTextureBacked()
               ? DawnContext::generation()
               : 0;
  }

  /** Replaces the image, made on the device of `generation`. */
  void setImage(sk_sp<SkImage> image, uint64_t generation) {
    setObject(std::move(image));
    _generation = generation;
  }

  /**
   Whether the image belongs to a GPU device that was lost: it draws
   nothing, and nothing can be read back from it.
   */
  bool isDead() const {
    return _generation != 0 && !DawnContext::isCurrent(_generation);
  }

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
  /** A promise rejected with an AbortError, for a readback of a dead image. */
  static jsi::Value deadReadback(jsi::Runtime &runtime, const char *method) {
    return RNSkAsync::settled(
        runtime, settleError(SkiaErrors::abort(
                     std::string(method) +
                     ": the image belongs to a GPU device that was lost")));
  }

  bool _sharesTexture;
  uint64_t _generation;
};

} // namespace RNSkia
