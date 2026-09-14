#pragma once

#include <memory>

#include "JsiSkColorFilter.h"
#include "JsiSkData.h"
#include "JsiSkNativeObjects.h"
#include "JsiSkPicture.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkData.h"
#include "include/core/SkPicture.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkPictureFactory : public JsiSkNativeObject<JsiSkPictureFactory> {
public:
  static constexpr const char *CLASS_NAME = "PictureFactory";

  JSI_HOST_FUNCTION(MakePicture) {
    // Handle null case - create JsiSkPicture with nullptr
    if (arguments[0].isNull() || arguments[0].isUndefined()) {
      return makeJsiObject(
          runtime, std::make_shared<JsiSkPicture>(getContext(), nullptr));
    }

    if (!arguments[0].isObject()) {
      throw jsi::JSError(runtime, "Expected arraybuffer as first parameter");
    }
    auto obj = arguments[0].asObject(runtime);

    // Check if it's a JsiSkData object first
    if (auto jsiData = tryGetJsiObject<JsiSkData>(runtime, obj)) {
      auto data = jsiData->getObject();
      auto picture = SkPicture::MakeFromData(data.get());
      if (picture != nullptr) {
        return makeJsiObject(runtime, std::make_shared<JsiSkPicture>(
                                          getContext(), std::move(picture)));
      }
      return jsi::Value::undefined();
    }

    // Get ArrayBuffer - try buffer property first (Uint8Array, etc.), then
    // direct ArrayBuffer
    jsi::ArrayBuffer buffer =
        obj.hasProperty(runtime, jsi::PropNameID::forAscii(runtime, "buffer"))
            ? obj.getProperty(runtime,
                              jsi::PropNameID::forAscii(runtime, "buffer"))
                  .asObject(runtime)
                  .getArrayBuffer(runtime)
            : obj.getArrayBuffer(runtime);

    sk_sp<SkData> data =
        SkData::MakeWithCopy(buffer.data(runtime), buffer.size(runtime));
    auto picture = SkPicture::MakeFromData(data.get());
    if (picture != nullptr) {
      return makeJsiObject(runtime, std::make_shared<JsiSkPicture>(
                                        getContext(), std::move(picture)));
    } else {
      return jsi::Value::undefined();
    }
  }

  size_t getMemoryPressure() override { return 1024; }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installHostMethod(runtime, prototype, "MakePicture",
                      &JsiSkPictureFactory::MakePicture);
  }

  explicit JsiSkPictureFactory(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkNativeObject<JsiSkPictureFactory>(std::move(context)) {}
};

} // namespace RNSkia
