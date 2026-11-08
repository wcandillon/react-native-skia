#pragma once

#include <memory>
#include <stdexcept>
#include <utility>

#include "api/JsiSkNativeObjects.h"
#include "api/JsiSkPicture.h"

#include "RNRecorder.h"
#include "RecorderStats.h"

#include <jsi/jsi.h>

namespace RNSkia {

namespace jsi = facebook::jsi;

/**
 * The JS handle on a recording. The scene graph visitor records through it
 * on the JS thread; the handle is then either passed to the view, which takes
 * ownership of the recording (SkiaViewApi.setJsiProperty), or played into a
 * picture (makePicture) for offscreen rendering.
 */
class JsiRecorder
    : public JsiSkWrappingSharedPtrNativeObject<JsiRecorder, Recorder> {
public:
  static constexpr const char *CLASS_NAME = "Recorder";

  explicit JsiRecorder(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkWrappingSharedPtrNativeObject<JsiRecorder, Recorder>(
            std::move(context), std::make_shared<Recorder>()) {
    getObject()->_context = getContext();
  }

  /**
   * Runs on the JS thread, when the runtime finalizes the wrapper. A view may
   * still own the recording and destroy it on another thread: the shared
   * values, which are objects of this runtime, must go first.
   */
  ~JsiRecorder() override { releaseSharedValues(); }

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

  /**
   * Plays the recording into a picture, on the calling thread, with the
   * current values of the shared values it still holds, read here on this
   * runtime (see Recorder::readSharedValues). A value invalid for its prop
   * throws, as recording it used to. Once getSharedValues() has taken the
   * shared values, only applyUpdates can read them: until it has, the picture
   * would draw the animated properties unset.
   */
  JSI_HOST_FUNCTION(makePicture) {
    auto recorder = getObject();
    recorder->readSharedValues(runtime);
    if (auto error = recorder->readError()) {
      throw std::runtime_error(*error);
    }
    if (!recorder->isReady()) {
      throw std::runtime_error("Cannot play a recording whose shared values "
                               "getSharedValues() took before they were read");
    }
    auto picture = recorder->makePicture();
    return makeJsiObject(runtime, std::make_shared<JsiSkPicture>(
                                      getContext(), std::move(picture)));
  }

  /**
   * The shared values the recording reads, in the order
   * SkiaViewApi.applyUpdates expects them. They are handed out once: the
   * recording lets go of them here, so that it can outlive the runtime's
   * interest in it (see Variables).
   */
  JSI_HOST_FUNCTION(getSharedValues) {
    return getObject()->variables.takeSharedValues(runtime);
  }

  JSI_HOST_FUNCTION(getId) { return jsi::Value(getObject()->id); }

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

  /**
   * Installs a recorder method like installHostMethod does. With
   * RNSKIA_RECORDER_STATS, the installed function counts its calls first
   * (RecorderStats::HostCalls), so that a benchmark can count the JSI calls
   * a commit makes.
   */
  static void installRecorderMethod(jsi::Runtime &runtime,
                                    jsi::Object &prototype, const char *name,
                                    HostMethod method) {
#ifdef RNSKIA_RECORDER_STATS
    auto func = jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forUtf8(runtime, name), 0,
        [method](jsi::Runtime &rt, const jsi::Value &thisValue,
                 const jsi::Value *arguments, size_t count) -> jsi::Value {
          RNSKIA_STAT_COUNT(HostCalls);
          auto native = fromThis(rt, thisValue);
          return ((*native).*method)(rt, thisValue, arguments, count);
        });
    prototype.setProperty(runtime, name, func);
#else
    installHostMethod(runtime, prototype, name, method);
#endif
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    installRecorderMethod(runtime, prototype, "saveGroup",
                          &JsiRecorder::saveGroup);
    installRecorderMethod(runtime, prototype, "restoreGroup",
                          &JsiRecorder::restoreGroup);
    installRecorderMethod(runtime, prototype, "savePaint",
                          &JsiRecorder::savePaint);
    installRecorderMethod(runtime, prototype, "restorePaint",
                          &JsiRecorder::restorePaint);
    installRecorderMethod(runtime, prototype, "restorePaintDeclaration",
                          &JsiRecorder::restorePaintDeclaration);
    installRecorderMethod(runtime, prototype, "materializePaint",
                          &JsiRecorder::materializePaint);
    installRecorderMethod(runtime, prototype, "pushPathEffect",
                          &JsiRecorder::pushPathEffect);
    installRecorderMethod(runtime, prototype, "pushImageFilter",
                          &JsiRecorder::pushImageFilter);
    installRecorderMethod(runtime, prototype, "pushColorFilter",
                          &JsiRecorder::pushColorFilter);
    installRecorderMethod(runtime, prototype, "pushShader",
                          &JsiRecorder::pushShader);
    installRecorderMethod(runtime, prototype, "pushBlurMaskFilter",
                          &JsiRecorder::pushBlurMaskFilter);
    installRecorderMethod(runtime, prototype, "composePathEffect",
                          &JsiRecorder::composePathEffect);
    installRecorderMethod(runtime, prototype, "composeColorFilter",
                          &JsiRecorder::composeColorFilter);
    installRecorderMethod(runtime, prototype, "composeImageFilter",
                          &JsiRecorder::composeImageFilter);
    installRecorderMethod(runtime, prototype, "saveCTM", &JsiRecorder::saveCTM);
    installRecorderMethod(runtime, prototype, "restoreCTM",
                          &JsiRecorder::restoreCTM);
    installRecorderMethod(runtime, prototype, "drawPaint",
                          &JsiRecorder::drawPaint);
    installRecorderMethod(runtime, prototype, "saveLayer",
                          &JsiRecorder::saveLayer);
    installRecorderMethod(runtime, prototype, "saveBackdropFilter",
                          &JsiRecorder::saveBackdropFilter);
    installRecorderMethod(runtime, prototype, "drawBox", &JsiRecorder::drawBox);
    installRecorderMethod(runtime, prototype, "drawImage",
                          &JsiRecorder::drawImage);
    installRecorderMethod(runtime, prototype, "drawCircle",
                          &JsiRecorder::drawCircle);
    installRecorderMethod(runtime, prototype, "drawPoints",
                          &JsiRecorder::drawPoints);
    installRecorderMethod(runtime, prototype, "drawPath",
                          &JsiRecorder::drawPath);
    installRecorderMethod(runtime, prototype, "drawRect",
                          &JsiRecorder::drawRect);
    installRecorderMethod(runtime, prototype, "drawRRect",
                          &JsiRecorder::drawRRect);
    installRecorderMethod(runtime, prototype, "drawOval",
                          &JsiRecorder::drawOval);
    installRecorderMethod(runtime, prototype, "drawLine",
                          &JsiRecorder::drawLine);
    installRecorderMethod(runtime, prototype, "drawPatch",
                          &JsiRecorder::drawPatch);
    installRecorderMethod(runtime, prototype, "drawVertices",
                          &JsiRecorder::drawVertices);
    installRecorderMethod(runtime, prototype, "drawDiffRect",
                          &JsiRecorder::drawDiffRect);
    installRecorderMethod(runtime, prototype, "drawText",
                          &JsiRecorder::drawText);
    installRecorderMethod(runtime, prototype, "drawTextPath",
                          &JsiRecorder::drawTextPath);
    installRecorderMethod(runtime, prototype, "drawTextBlob",
                          &JsiRecorder::drawTextBlob);
    installRecorderMethod(runtime, prototype, "drawGlyphs",
                          &JsiRecorder::drawGlyphs);
    installRecorderMethod(runtime, prototype, "drawPicture",
                          &JsiRecorder::drawPicture);
    installRecorderMethod(runtime, prototype, "drawImageSVG",
                          &JsiRecorder::drawImageSVG);
    installRecorderMethod(runtime, prototype, "drawParagraph",
                          &JsiRecorder::drawParagraph);
    installRecorderMethod(runtime, prototype, "drawAtlas",
                          &JsiRecorder::drawAtlas);
    installRecorderMethod(runtime, prototype, "drawSkottie",
                          &JsiRecorder::drawSkottie);
    installRecorderMethod(runtime, prototype, "makePicture",
                          &JsiRecorder::makePicture);
    installRecorderMethod(runtime, prototype, "getSharedValues",
                          &JsiRecorder::getSharedValues);
    installRecorderMethod(runtime, prototype, "getId", &JsiRecorder::getId);
  }

  // The recorder itself is a small command list. The resources it references
  // (images, pictures, paths) report their own size through their wrappers
  // and the pictures produced by makePicture() report theirs. Do not put a
  // made-up number here: a new recorder is created on every React commit, and
  // the wrapper is disposed as soon as the view takes ownership of the
  // recording (see Container.native.ts), so the charge would never drive a
  // collection anyway.
  size_t getMemoryPressure() override { return kMinMemoryPressure; }

  static const jsi::HostFunctionType
  createCtor(std::shared_ptr<RNSkPlatformContext> context) {
    return JSI_HOST_FUNCTION_LAMBDA {
      // Return the newly constructed object
      auto recorder = std::make_shared<JsiRecorder>(std::move(context));
      return makeJsiObject(runtime, std::move(recorder));
    };
  }

protected:
  /**
   * Runs on the JS thread (dispose() or the finalizer). The shared values the
   * recording still holds are runtime objects: they must go here, before the
   * recording is left to the view and the threads that replay it.
   */
  void releaseResources() override {
    releaseSharedValues();
    JsiSkWrappingSharedPtrNativeObject<JsiRecorder,
                                       Recorder>::releaseResources();
  }

private:
  /**
   * The shared values are objects of the recording runtime: both the
   * containers take them (getSharedValues) right after recording, so this is
   * normally a no-op by the time the wrapper goes, and the runtime that
   * finalizes it is the one that recorded.
   */
  void releaseSharedValues() {
    if (auto recorder = getObjectUnchecked()) {
      recorder->variables.releaseSharedValues();
    }
  }
};

} // namespace RNSkia
