#pragma once

#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkPicture.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"


#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiDraw {

public:
  static const jsi::HostFunctionType
  createCtor(std::shared_ptr<RNSkPlatformContext> context) {
    return JSI_HOST_FUNCTION_LAMBDA {
        SkPictureRecorder recorder;
        SkCanvas* pictureCanvas = recorder.beginRecording({64, 64, 192, 192});
        SkPaint paint;
        pictureCanvas->drawRect(SkRect::MakeWH(200, 200), paint);
        paint.setColor(SK_ColorWHITE);
        pictureCanvas->drawRect(SkRect::MakeLTRB(20, 20, 180, 180), paint);
        sk_sp<SkPicture> picture = recorder.finishRecordingAsPicture();

      // Return the newly constructed object
      return jsi::Object::createFromHostObject(
          runtime,
          std::make_shared<JsiSkPicture>(std::move(context), std::move(picture)));
    };
  }
};
} // namespace RNSkia
