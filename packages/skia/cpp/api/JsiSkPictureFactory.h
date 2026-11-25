#pragma once

#include <memory>

#include "JsiSkColorFilter.h"
#include "JsiSkData.h"
#include "JsiSkNativeObjects.h"
#include "JsiSkPicture.h"
#include "SkiaErrors.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkData.h"
#include "include/core/SkPicture.h"
#include "include/core/SkPictureRecorder.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkPictureFactory : public JsiSkNativeObject<JsiSkPictureFactory> {
public:
  static constexpr const char *CLASS_NAME = "PictureFactory";

  // A picture serialized before (SkPicture.serialize()), from an SkData, a
  // typed array or an ArrayBuffer.
  JSI_HOST_FUNCTION(Make) {
    if (count < 1 || !arguments[0].isObject()) {
      throw SkiaErrors::typeError(
          "Picture.Make expects an SkData, a Uint8Array or an ArrayBuffer");
    }
    auto obj = arguments[0].asObject(runtime);

    sk_sp<SkData> data;
    if (auto jsiData = tryGetJsiObject<JsiSkData>(runtime, obj)) {
      data = jsiData->getObject();
    } else {
      // A typed array's buffer, or an ArrayBuffer itself.
      auto bufferValue = obj.hasProperty(runtime, "buffer")
                             ? obj.getProperty(runtime, "buffer")
                             : jsi::Value(runtime, obj);
      if (!bufferValue.isObject() ||
          !bufferValue.asObject(runtime).isArrayBuffer(runtime)) {
        throw SkiaErrors::typeError(
            "Picture.Make expects an SkData, a Uint8Array or an ArrayBuffer");
      }
      auto buffer = bufferValue.asObject(runtime).getArrayBuffer(runtime);
      // The view's own range of the buffer, not all of it.
      size_t offset = 0;
      size_t length = buffer.size(runtime);
      if (obj.hasProperty(runtime, "byteOffset")) {
        offset = static_cast<size_t>(
            obj.getProperty(runtime, "byteOffset").asNumber());
        length = static_cast<size_t>(
            obj.getProperty(runtime, "byteLength").asNumber());
      }
      data = SkData::MakeWithCopy(buffer.data(runtime) + offset, length);
    }
    auto picture = SkPicture::MakeFromData(data.get());
    if (picture == nullptr) {
      throw SkiaErrors::decode(
          "Picture.Make: the data is not a serialized picture", "picture");
    }
    return makeJsiObject(runtime, std::make_shared<JsiSkPicture>(
                                      getContext(), std::move(picture)));
  }

  // A picture that draws nothing.
  std::shared_ptr<JsiSkPicture> MakeEmpty() {
    SkPictureRecorder recorder;
    recorder.beginRecording(SkRect::MakeEmpty());
    return std::make_shared<JsiSkPicture>(getContext(),
                                          recorder.finishRecordingAsPicture());
  }

  size_t getMemoryPressure() override { return 1024; }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installHostMethod(runtime, prototype, "Make", &JsiSkPictureFactory::Make);
    installMethod(runtime, prototype, "MakeEmpty",
                  &JsiSkPictureFactory::MakeEmpty);
  }

  explicit JsiSkPictureFactory(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkNativeObject<JsiSkPictureFactory>(std::move(context)) {}
};

} // namespace RNSkia
