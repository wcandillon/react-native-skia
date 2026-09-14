#pragma once

#include <memory>
#include <numeric>
#include <utility>
#include <vector>

#include "api/JsiSkCanvas.h"
#include "api/JsiSkNativeObjects.h"
#include "api/JsiSkPicture.h"

#include "DrawingCtx.h"
#include "RNRecorder.h"
#include "utils/RNSkLog.h"

#include <jsi/jsi.h>

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiRecorder
    : public JsiSkWrappingSharedPtrNativeObject<JsiRecorder, Recorder> {
public:
  static constexpr const char *CLASS_NAME = "Recorder";

  JsiRecorder(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkWrappingSharedPtrNativeObject<JsiRecorder, Recorder>(
            std::move(context), std::make_shared<Recorder>()) {
    getObject()->_context = getContext();
  }

  JSI_HOST_FUNCTION(savePaint) {
    getObject()->savePaint(runtime, arguments[0].asObject(runtime),
                           arguments[1].asBool());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(materializePaint) {
    getObject()->materializePaint();
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawCircle) {
    getObject()->drawCircle(runtime, arguments[0].asObject(runtime));
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(restorePaint) {
    getObject()->restorePaint();
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawPaint) {
    getObject()->drawPaint();
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(play) {
    // Check if a picture parameter was provided
    if (count < 1 || arguments[0].isUndefined() || arguments[0].isNull()) {
      throw jsi::JSError(runtime, "play() requires a Picture parameter");
    }

    // Get the JsiSkPicture from the argument
    auto pictureObject = arguments[0].asObject(runtime);
    auto pictureHostObject =
        tryGetJsiObject<JsiSkPicture>(runtime, pictureObject);
    if (!pictureHostObject) {
      throw jsi::JSError(runtime, "Invalid Picture object provided to play()");
    }

    // Create a new picture recorder to record into
    SkPictureRecorder pictureRecorder;
    SkISize size = SkISize::Make(2'000'000, 2'000'000);
    SkRect rect = SkRect::Make(size);
    auto canvas = pictureRecorder.beginRecording(rect, nullptr);

    // Play the recorded commands into the canvas
    DrawingCtx ctx(canvas);
    getObject()->play(&ctx);

    // Finish recording and get the new picture
    auto newPicture = pictureRecorder.finishRecordingAsPicture();

    // Update the existing JsiSkPicture object with the new SkPicture
    // This reuses the existing JavaScript object instead of creating a new one
    pictureHostObject->setObject(std::move(newPicture));
    auto memoryPressure = pictureHostObject->getMemoryPressure();
    pictureObject.setExternalMemoryPressure(runtime, memoryPressure);

    // Return undefined since we're modifying the passed-in object
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(applyUpdates) {
    auto values = arguments[0].asObject(runtime).asArray(runtime);
    auto size = values.size(runtime);
    auto recorder = getObject();
    for (int i = 0; i < size; i++) {
      auto sharedValue = values.getValueAtIndex(runtime, i).asObject(runtime);
      auto name = "variable" + std::to_string(i);
      // Look up the conversion functions for this name
      auto it = recorder->variables.find(name);
      if (it != recorder->variables.end()) {
        // Execute each conversion function in the vector
        const auto &conversionFunctions = it->second;
        for (const auto &conversionFunc : conversionFunctions) {
          conversionFunc(runtime, sharedValue);
        }
      }
    }
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(saveGroup) {
    const jsi::Value *value = count > 0 ? &arguments[0] : nullptr;
    getObject()->saveGroup(runtime, value);
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(restoreGroup) {
    getObject()->restoreGroup();
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(restorePaintDeclaration) {
    getObject()->restorePaintDeclaration();
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(pushPathEffect) {
    getObject()->pushPathEffect(runtime,
                                arguments[0].asString(runtime).utf8(runtime),
                                arguments[1].asObject(runtime));
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(pushImageFilter) {
    getObject()->pushImageFilter(runtime,
                                 arguments[0].asString(runtime).utf8(runtime),
                                 arguments[1].asObject(runtime));
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(pushColorFilter) {
    getObject()->pushColorFilter(runtime,
                                 arguments[0].asString(runtime).utf8(runtime),
                                 arguments[1].asObject(runtime));
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(pushShader) {
    getObject()->pushShader(
        runtime, arguments[0].asString(runtime).utf8(runtime),
        arguments[1].asObject(runtime), arguments[2].asNumber());
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(pushBlurMaskFilter) {
    getObject()->pushBlurMaskFilter(runtime, arguments[0].asObject(runtime));
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(composePathEffect) {
    getObject()->composePathEffect();
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(composeColorFilter) {
    getObject()->composeColorFilter();
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(composeImageFilter) {
    getObject()->composeImageFilter();
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(saveCTM) {
    getObject()->saveCTM(runtime, arguments[0].asObject(runtime));
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(restoreCTM) {
    getObject()->restoreCTM();
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(saveLayer) {
    getObject()->saveLayer();
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(saveBackdropFilter) {
    getObject()->saveBackdropFilter();
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawBox) {
    auto boxProps = arguments[0].asObject(runtime);
    auto shadowsArray = arguments[1].asObject(runtime).asArray(runtime);
    getObject()->drawBox(runtime, boxProps, shadowsArray);
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawImage) {
    getObject()->drawImage(runtime, arguments[0].asObject(runtime));
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawPoints) {
    getObject()->drawPoints(runtime, arguments[0].asObject(runtime));
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawPath) {
    getObject()->drawPath(runtime, arguments[0].asObject(runtime));
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawRect) {
    getObject()->drawRect(runtime, arguments[0].asObject(runtime));
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawRRect) {
    getObject()->drawRRect(runtime, arguments[0].asObject(runtime));
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawOval) {
    getObject()->drawOval(runtime, arguments[0].asObject(runtime));
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawLine) {
    getObject()->drawLine(runtime, arguments[0].asObject(runtime));
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawPatch) {
    getObject()->drawPatch(runtime, arguments[0].asObject(runtime));
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawVertices) {
    getObject()->drawVertices(runtime, arguments[0].asObject(runtime));
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawDiffRect) {
    getObject()->drawDiffRect(runtime, arguments[0].asObject(runtime));
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawText) {
    getObject()->drawText(runtime, arguments[0].asObject(runtime));
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawTextPath) {
    getObject()->drawTextPath(runtime, arguments[0].asObject(runtime));
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawTextBlob) {
    getObject()->drawTextBlob(runtime, arguments[0].asObject(runtime));
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawGlyphs) {
    getObject()->drawGlyphs(runtime, arguments[0].asObject(runtime));
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawPicture) {
    getObject()->drawPicture(runtime, arguments[0].asObject(runtime));
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawImageSVG) {
    getObject()->drawImageSVG(runtime, arguments[0].asObject(runtime));
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawParagraph) {
    getObject()->drawParagraph(runtime, arguments[0].asObject(runtime));
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawAtlas) {
    getObject()->drawAtlas(runtime, arguments[0].asObject(runtime));
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(drawSkottie) {
    getObject()->drawSkottie(runtime, arguments[0].asObject(runtime));
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(reset) {
    auto newRecorder = std::make_shared<Recorder>();
    newRecorder->_context = getContext();
    setObject(newRecorder);
    return jsi::Value::undefined();
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    installHostMethod(runtime, prototype, "saveGroup", &JsiRecorder::saveGroup);
    installHostMethod(runtime, prototype, "restoreGroup",
                      &JsiRecorder::restoreGroup);
    installHostMethod(runtime, prototype, "savePaint", &JsiRecorder::savePaint);
    installHostMethod(runtime, prototype, "restorePaint",
                      &JsiRecorder::restorePaint);
    installHostMethod(runtime, prototype, "restorePaintDeclaration",
                      &JsiRecorder::restorePaintDeclaration);
    installHostMethod(runtime, prototype, "materializePaint",
                      &JsiRecorder::materializePaint);
    installHostMethod(runtime, prototype, "pushPathEffect",
                      &JsiRecorder::pushPathEffect);
    installHostMethod(runtime, prototype, "pushImageFilter",
                      &JsiRecorder::pushImageFilter);
    installHostMethod(runtime, prototype, "pushColorFilter",
                      &JsiRecorder::pushColorFilter);
    installHostMethod(runtime, prototype, "pushShader",
                      &JsiRecorder::pushShader);
    installHostMethod(runtime, prototype, "pushBlurMaskFilter",
                      &JsiRecorder::pushBlurMaskFilter);
    installHostMethod(runtime, prototype, "composePathEffect",
                      &JsiRecorder::composePathEffect);
    installHostMethod(runtime, prototype, "composeColorFilter",
                      &JsiRecorder::composeColorFilter);
    installHostMethod(runtime, prototype, "composeImageFilter",
                      &JsiRecorder::composeImageFilter);
    installHostMethod(runtime, prototype, "saveCTM", &JsiRecorder::saveCTM);
    installHostMethod(runtime, prototype, "restoreCTM",
                      &JsiRecorder::restoreCTM);
    installHostMethod(runtime, prototype, "drawPaint", &JsiRecorder::drawPaint);
    installHostMethod(runtime, prototype, "saveLayer", &JsiRecorder::saveLayer);
    installHostMethod(runtime, prototype, "saveBackdropFilter",
                      &JsiRecorder::saveBackdropFilter);
    installHostMethod(runtime, prototype, "drawBox", &JsiRecorder::drawBox);
    installHostMethod(runtime, prototype, "drawImage", &JsiRecorder::drawImage);
    installHostMethod(runtime, prototype, "drawCircle",
                      &JsiRecorder::drawCircle);
    installHostMethod(runtime, prototype, "drawPoints",
                      &JsiRecorder::drawPoints);
    installHostMethod(runtime, prototype, "drawPath", &JsiRecorder::drawPath);
    installHostMethod(runtime, prototype, "drawRect", &JsiRecorder::drawRect);
    installHostMethod(runtime, prototype, "drawRRect", &JsiRecorder::drawRRect);
    installHostMethod(runtime, prototype, "drawOval", &JsiRecorder::drawOval);
    installHostMethod(runtime, prototype, "drawLine", &JsiRecorder::drawLine);
    installHostMethod(runtime, prototype, "drawPatch", &JsiRecorder::drawPatch);
    installHostMethod(runtime, prototype, "drawVertices",
                      &JsiRecorder::drawVertices);
    installHostMethod(runtime, prototype, "drawDiffRect",
                      &JsiRecorder::drawDiffRect);
    installHostMethod(runtime, prototype, "drawText", &JsiRecorder::drawText);
    installHostMethod(runtime, prototype, "drawTextPath",
                      &JsiRecorder::drawTextPath);
    installHostMethod(runtime, prototype, "drawTextBlob",
                      &JsiRecorder::drawTextBlob);
    installHostMethod(runtime, prototype, "drawGlyphs",
                      &JsiRecorder::drawGlyphs);
    installHostMethod(runtime, prototype, "drawPicture",
                      &JsiRecorder::drawPicture);
    installHostMethod(runtime, prototype, "drawImageSVG",
                      &JsiRecorder::drawImageSVG);
    installHostMethod(runtime, prototype, "drawParagraph",
                      &JsiRecorder::drawParagraph);
    installHostMethod(runtime, prototype, "drawAtlas", &JsiRecorder::drawAtlas);
    installHostMethod(runtime, prototype, "drawSkottie",
                      &JsiRecorder::drawSkottie);
    installHostMethod(runtime, prototype, "play", &JsiRecorder::play);
    installHostMethod(runtime, prototype, "applyUpdates",
                      &JsiRecorder::applyUpdates);
    installHostMethod(runtime, prototype, "reset", &JsiRecorder::reset);
  }

  // This has no basis in reality but since since these are private long-lived
  // objects, we think it is more than fine.
  size_t getMemoryPressure() override { return 5 * 1024 * 1024; }

  static const jsi::HostFunctionType
  createCtor(std::shared_ptr<RNSkPlatformContext> context) {
    return JSI_HOST_FUNCTION_LAMBDA {
      // Return the newly constructed object
      auto recorder = std::make_shared<JsiRecorder>(std::move(context));
      return makeJsiObject(runtime, std::move(recorder));
    };
  }
};

} // namespace RNSkia
