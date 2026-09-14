#pragma once

#include <memory>

#include "JsiSkCanvas.h"
#include "JsiSkConverters.h"
#include "JsiSkNativeObjects.h"
#include "JsiSkPicture.h"
#include "JsiSkRect.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkBBHFactory.h"
#include "include/core/SkPictureRecorder.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkPictureRecorder
    : public JsiSkWrappingSharedPtrNativeObject<JsiSkPictureRecorder,
                                                SkPictureRecorder> {
public:
  static constexpr const char *CLASS_NAME = "PictureRecorder";

  explicit JsiSkPictureRecorder(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkWrappingSharedPtrNativeObject<JsiSkPictureRecorder,
                                           SkPictureRecorder>(
            context, std::make_shared<SkPictureRecorder>()) {}

  std::shared_ptr<JsiSkCanvas>
  beginRecording(JsiOptional<std::shared_ptr<SkRect>> rect) {
    SkCanvas *canvas;
    if (rect.has_value()) {
      SkRTreeFactory factory;
      canvas = getObject()->beginRecording(**rect, &factory);
    } else {
      SkISize size = SkISize::Make(2'000'000, 2'000'000);
      SkRect bounds = SkRect::Make(size);
      canvas = getObject()->beginRecording(bounds, nullptr);
    }
    return std::make_shared<JsiSkCanvas>(getContext(), canvas);
  }

  std::shared_ptr<JsiSkPicture> finishRecordingAsPicture() {
    auto picture = getObject()->finishRecordingAsPicture();
    return std::make_shared<JsiSkPicture>(getContext(), std::move(picture));
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    installMethod(runtime, prototype, "beginRecording",
                  &JsiSkPictureRecorder::beginRecording);
    installMethod(runtime, prototype, "finishRecordingAsPicture",
                  &JsiSkPictureRecorder::finishRecordingAsPicture);
  }

  size_t getMemoryPressure() override { return 1024 * 1024; }

  static const jsi::HostFunctionType
  createCtor(std::shared_ptr<RNSkPlatformContext> context) {
    return JSI_HOST_FUNCTION_LAMBDA {
      return makeJsiObject(runtime,
                           std::make_shared<JsiSkPictureRecorder>(context));
    };
  }
};
} // namespace RNSkia
