#pragma once

#include <memory>
#include <stdexcept>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkCanvas.h"
#include "JsiSkGraphiteRecording.h"
#include "JsiSkNativeObjects.h"
#include "rnskia/RNSkGraphiteTarget.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

/**
 * The recording side of a SkiaGraphiteView, handed to JS by
 * SkiaViewApi.makeGraphiteContext. It can be captured into any runtime:
 * recording happens on the calling thread, presenting on the main thread.
 * Every context made for a view shares the view's target, which keeps its
 * one open recording and the canvas JS draws it on (see
 * RNSkGraphiteTarget::beginRecording).
 */
class JsiSkGraphiteContext
    : public JsiSkWrappingSharedPtrNativeObject<JsiSkGraphiteContext,
                                                RNSkGraphiteTarget> {
public:
  static constexpr const char *CLASS_NAME = "GraphiteContext";

  JsiSkGraphiteContext(std::shared_ptr<RNSkPlatformContext> context,
                       std::shared_ptr<RNSkGraphiteTarget> target)
      : JsiSkWrappingSharedPtrNativeObject<JsiSkGraphiteContext,
                                           RNSkGraphiteTarget>(
            std::move(context), std::move(target)) {}

  double getWidth() { return getObject()->getWidth(); }

  double getHeight() { return getObject()->getHeight(); }

  std::shared_ptr<JsiSkCanvas> beginRecording() {
    auto canvas = getObject()->beginRecording();
    if (canvas == nullptr) {
      throw std::runtime_error("SkiaGraphiteView: the view has no size yet.");
    }
    return canvas;
  }

  std::shared_ptr<JsiSkGraphiteRecording> finishRecording() {
    return std::make_shared<JsiSkGraphiteRecording>(
        getContext(), getObject()->finishRecording());
  }

  void submit(std::shared_ptr<JsiSkGraphiteRecording> recording) {
    getObject()->submit(recording->getObject());
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    installGetter(runtime, prototype, "width", &JsiSkGraphiteContext::getWidth);
    installGetter(runtime, prototype, "height",
                  &JsiSkGraphiteContext::getHeight);
    installMethod(runtime, prototype, "beginRecording",
                  &JsiSkGraphiteContext::beginRecording);
    installMethod(runtime, prototype, "finishRecording",
                  &JsiSkGraphiteContext::finishRecording);
    installMethod(runtime, prototype, "submit", &JsiSkGraphiteContext::submit);
  }

  size_t getMemoryPressure() override { return 1024; }
};

} // namespace RNSkia
