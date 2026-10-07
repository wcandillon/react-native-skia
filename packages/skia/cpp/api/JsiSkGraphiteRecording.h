#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkNativeObjects.h"
#include "rnskia/RNSkGraphiteTarget.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

/**
 * A frame recorded for a SkiaGraphiteView. Immutable: submit it to the view
 * as many times as needed, from any runtime.
 */
class JsiSkGraphiteRecording
    : public JsiSkWrappingSharedPtrNativeObject<JsiSkGraphiteRecording,
                                                RNSkGraphiteRecording> {
public:
  static constexpr const char *CLASS_NAME = "GraphiteRecording";

  JsiSkGraphiteRecording(std::shared_ptr<RNSkPlatformContext> context,
                         std::shared_ptr<RNSkGraphiteRecording> recording)
      : JsiSkWrappingSharedPtrNativeObject<JsiSkGraphiteRecording,
                                           RNSkGraphiteRecording>(
            std::move(context), std::move(recording)) {}

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
  }

  // A recording holds the GPU buffers and textures of a frame; Graphite does
  // not report their size.
  size_t getMemoryPressure() override { return isDisposed() ? 0 : 64 * 1024; }
};

} // namespace RNSkia
