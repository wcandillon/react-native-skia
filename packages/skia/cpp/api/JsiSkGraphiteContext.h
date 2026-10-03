#pragma once

#include <memory>
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
    auto *canvas = getObject()->beginRecording();
    auto jsiCanvas = std::make_shared<JsiSkCanvas>(getContext(), canvas);
    _canvas = jsiCanvas;
    return jsiCanvas;
  }

  std::shared_ptr<JsiSkGraphiteRecording> finishRecording() {
    auto recording = getObject()->finishRecording();
    // The deferred canvas is deleted by the snap.
    if (auto canvas = _canvas.lock()) {
      canvas->setCanvas(nullptr);
    }
    _canvas.reset();
    return std::make_shared<JsiSkGraphiteRecording>(getContext(),
                                                    std::move(recording));
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

private:
  std::weak_ptr<JsiSkCanvas> _canvas;
};

} // namespace RNSkia
