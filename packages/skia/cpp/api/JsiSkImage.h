#pragma once

#include <memory>
#include <string>
#include <utility>

#include "JsiSkDispatcher.h"
#include "JsiSkHostObjects.h"
#include "JsiSkImageInfo.h"
#include "JsiSkMatrix.h"
#include "JsiSkShader.h"
#include "third_party/base64.h"

#include "JsiTextureInfo.h"
#include "RNSkTypedArray.h"

#if defined(SK_GRAPHITE)
#include "RNDawnContext.h"
#include "include/gpu/graphite/Context.h"
#else
#include "include/gpu/ganesh/GrDirectContext.h"
#endif

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/codec/SkEncodedImageFormat.h"
#include "include/core/SkImage.h"
#include "include/core/SkStream.h"
#include "include/encode/SkJpegEncoder.h"
#include "include/encode/SkPngEncoder.h"
#include "include/encode/SkWebpEncoder.h"

#pragma clang diagnostic pop

#include <jsi/jsi.h>

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

class JsiSkImage : public JsiSkWrappingSkPtrHostObject<SkImage> {
private:
  std::shared_ptr<Dispatcher> _dispatcher;

public:
  // TODO-API: Properties?
  JSI_HOST_FUNCTION(width) { return static_cast<double>(getObject()->width()); }
  JSI_HOST_FUNCTION(height) {
    return static_cast<double>(getObject()->height());
  }

  JSI_HOST_FUNCTION(getImageInfo) {
    return JsiSkImageInfo::toValue(runtime, getContext(),
                                   getObject()->imageInfo());
  }

  JSI_HOST_FUNCTION(makeShaderOptions) {
    auto tmx = (SkTileMode)arguments[0].asNumber();
    auto tmy = (SkTileMode)arguments[1].asNumber();
    auto fm = (SkFilterMode)arguments[2].asNumber();
    auto mm = (SkMipmapMode)arguments[3].asNumber();
    auto m = count > 4 && !arguments[4].isUndefined()
                 ? JsiSkMatrix::fromValue(runtime, arguments[4]).get()
                 : nullptr;
    auto shader =
        getObject()->makeShader(tmx, tmy, SkSamplingOptions(fm, mm), m);
    auto shaderObj =
        std::make_shared<JsiSkShader>(getContext(), std::move(shader));
    return JSI_CREATE_HOST_OBJECT_WITH_MEMORY_PRESSURE(runtime, shaderObj,
                                                       getContext());
  }

  JSI_HOST_FUNCTION(makeShaderCubic) {
    auto tmx = (SkTileMode)arguments[0].asNumber();
    auto tmy = (SkTileMode)arguments[1].asNumber();
    auto B = SkDoubleToScalar(arguments[2].asNumber());
    auto C = SkDoubleToScalar(arguments[3].asNumber());
    auto m = count > 4 && !arguments[4].isUndefined()
                 ? JsiSkMatrix::fromValue(runtime, arguments[4]).get()
                 : nullptr;
    auto shader =
        getObject()->makeShader(tmx, tmy, SkSamplingOptions({B, C}), m);
    auto shaderObj =
        std::make_shared<JsiSkShader>(getContext(), std::move(shader));
    return JSI_CREATE_HOST_OBJECT_WITH_MEMORY_PRESSURE(runtime, shaderObj,
                                                       getContext());
  }

  sk_sp<SkData> encodeImageData(const jsi::Value *arguments, size_t count) {
    // Get optional parameters
    auto format =
        count >= 1 ? static_cast<SkEncodedImageFormat>(arguments[0].asNumber())
                   : SkEncodedImageFormat::kPNG;

    auto quality = (count >= 2 && arguments[1].isNumber())
                       ? arguments[1].asNumber()
                       : 100.0;
    auto image = getObject();
#if defined(SK_GRAPHITE)
    image = DawnContext::getInstance().MakeRasterImage(image);
#else
    if (image->isTextureBacked()) {
      auto grContext = getContext()->getDirectContext();
      image = image->makeRasterImage(grContext);
      if (!image) {
        return nullptr;
      }
    }
#endif
    sk_sp<SkData> data;

    if (format == SkEncodedImageFormat::kJPEG) {
      SkJpegEncoder::Options options;
      options.fQuality = quality;
      data = SkJpegEncoder::Encode(nullptr, image.get(), options);
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

  JSI_HOST_FUNCTION(encodeToBytes) {
    auto data = encodeImageData(arguments, count);
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

  JSI_HOST_FUNCTION(encodeToBase64) {
    auto data = encodeImageData(arguments, count);
    if (!data) {
      return jsi::Value::null();
    }

    auto len = Base64::Encode(data->bytes(), data->size(), nullptr);
    auto buffer = std::string(len, 0);
    Base64::Encode(data->bytes(), data->size(),
                   reinterpret_cast<void *>(&buffer[0]));
    return jsi::String::createFromAscii(runtime, buffer);
  }

  JSI_HOST_FUNCTION(readPixels) {
#if defined(SK_GRAPHITE)
    throw std::runtime_error("Not implemented yet");
#else
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

    auto grContext = getContext()->getDirectContext();
    if (!getObject()->readPixels(grContext, info, bfrPtr, bytesPerRow, srcX,
                                 srcY)) {
      return jsi::Value::null();
    }
    return dest;
#endif
  }

  JSI_HOST_FUNCTION(makeNonTextureImage) {
#if defined(SK_GRAPHITE)
    auto rasterImage = DawnContext::getInstance().MakeRasterImage(getObject());
#else
    auto grContext = getContext()->getDirectContext();
    auto image = getObject();
    if (!grContext) {
      throw jsi::JSError(runtime, "No GPU context available");
    }
    if (image && !image->isValid(grContext->asRecorder())) {
      throw jsi::JSError(runtime, "invoked makeNonTextureImage() on an image "
                                  "that does not belong to this context");
    }
    auto rasterImage = image->makeRasterImage(grContext);
#endif
    auto hostObjectInstance =
        std::make_shared<JsiSkImage>(getContext(), std::move(rasterImage));
    return JSI_CREATE_HOST_OBJECT_WITH_MEMORY_PRESSURE(
        runtime, hostObjectInstance, getContext());
  }

  JSI_HOST_FUNCTION(getNativeTextureUnstable) {
    auto image = getObject();
    if (!image->isTextureBacked()) {
      return jsi::Value::null();
    }
    auto texInfo = getContext()->getTexture(image);
    return JsiTextureInfo::toValue(runtime, texInfo);
  }

  JSI_HOST_FUNCTION(isTextureBacked) {
    return jsi::Value(getObject()->isTextureBacked());
  }

  EXPORT_JSI_API_TYPENAME(JsiSkImage, Image)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiSkImage, width),
                       JSI_EXPORT_FUNC(JsiSkImage, height),
                       JSI_EXPORT_FUNC(JsiSkImage, getImageInfo),
                       JSI_EXPORT_FUNC(JsiSkImage, makeShaderOptions),
                       JSI_EXPORT_FUNC(JsiSkImage, makeShaderCubic),
                       JSI_EXPORT_FUNC(JsiSkImage, encodeToBytes),
                       JSI_EXPORT_FUNC(JsiSkImage, encodeToBase64),
                       JSI_EXPORT_FUNC(JsiSkImage, readPixels),
                       JSI_EXPORT_FUNC(JsiSkImage, makeNonTextureImage),
                       JSI_EXPORT_FUNC(JsiSkImage, getNativeTextureUnstable),
                       JSI_EXPORT_FUNC(JsiSkImage, isTextureBacked),
                       JSI_EXPORT_FUNC(JsiSkImage, dispose))

  JsiSkImage(std::shared_ptr<RNSkPlatformContext> context,
             const sk_sp<SkImage> image)
      : JsiSkWrappingSkPtrHostObject<SkImage>(std::move(context),
                                              std::move(image)) {
    // Get the dispatcher for the current thread
    _dispatcher = Dispatcher::getDispatcher();
    // Process any pending operations
    _dispatcher->processQueue();
  }

  ~JsiSkImage() override {
    // Queue deletion on the creation thread if needed
    auto image = getObject();
    if (image && _dispatcher) {
      _dispatcher->run([image]() {
        // Image will be deleted when this lambda is destroyed
      });
    }
    // Clear the object to prevent base class destructor from deleting it
    setObject(nullptr);
  }

  size_t getMemoryPressure() const override {
    auto image = getObject();
    if (!image) {
      return 0;
    }

    size_t baseSize;
    if (image->isTextureBacked()) {
      // For texture-backed images, use the texture size
      baseSize = image->textureSize();

      // GPU textures have additional overhead:
      // - Driver overhead for texture management (~10-15%)
      // - Potential alignment/padding requirements
      // - Command buffer references
      baseSize = static_cast<size_t>(baseSize * 1.15);

      // If the image has mipmaps, add ~33% more memory
      // (1 + 1/4 + 1/16 + ... ≈ 1.33)
      if (image->hasMipmaps()) {
        baseSize = static_cast<size_t>(baseSize * 1.33);
      }
    } else {
      // For raster images, use the computed byte size
      baseSize = image->imageInfo().computeMinByteSize();

      // Add small overhead for SkImage object and metadata (~5%)
      baseSize = static_cast<size_t>(baseSize * 1.05);
    }

    return baseSize;
  }
};

} // namespace RNSkia