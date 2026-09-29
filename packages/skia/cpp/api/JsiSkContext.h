#pragma once

#include <memory>
#include <optional>
#include <string>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkCanvas.h"
#include "JsiSkColor.h"
#include "JsiSkNativeObjects.h"
#include "JsiSkPicture.h"
#include "rnskia/RNSkBenchmarkProducer.h"
#include "rnskia/RNSkThreadPriority.h"

#if defined(SK_GRAPHITE)
#include "JsiSkRecording.h"
#include "rnskia/RNDawnContext.h"
#include "rnskia/RNSkDeferredTarget.h"
#endif

namespace RNSkia {

namespace jsi = facebook::jsi;

/**
 * Skia.Context: produces Graphite Recordings for SkiaRecordingView.
 *
 * Both methods use the calling thread's Recorder (DawnContext::getRecorder is
 * thread-local), which is what lets a worklet on the UI thread and code on
 * the JS thread each produce frames without sharing state. The deferred
 * target pending on the calling thread is tracked thread-locally for the same
 * reason.
 */
class JsiSkContext : public JsiSkNativeObject<JsiSkContext> {
public:
  static constexpr const char *CLASS_NAME = "Context";

  explicit JsiSkContext(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkNativeObject<JsiSkContext>(std::move(context)) {}

  JSI_HOST_FUNCTION(makeDeferredCanvas) {
#if defined(SK_GRAPHITE)
    if (count < 1 || !arguments[0].isObject()) {
      throw jsi::JSError(runtime, "makeDeferredCanvas: expected a target "
                                  "{width, height, highBitDepth?}");
    }
    auto info = arguments[0].asObject(runtime);
    auto widthValue = info.getProperty(runtime, "width");
    auto heightValue = info.getProperty(runtime, "height");
    if (!widthValue.isNumber() || !heightValue.isNumber()) {
      throw jsi::JSError(
          runtime, "makeDeferredCanvas: width and height must be numbers");
    }
    int width = static_cast<int>(widthValue.asNumber());
    int height = static_cast<int>(heightValue.asNumber());
    if (width <= 0 || height <= 0) {
      throw jsi::JSError(runtime,
                         "makeDeferredCanvas: width and height must be > 0");
    }
    auto highBitDepthValue = info.getProperty(runtime, "highBitDepth");
    bool highBitDepth =
        highBitDepthValue.isBool() && highBitDepthValue.getBool();

    auto &dawnContext = DawnContext::getInstance();
    auto target = dawnContext.makeDeferredTarget(width, height, highBitDepth);
    auto *canvas = dawnContext.getRecorder()->makeDeferredCanvas(
        target.imageInfo, target.textureInfo);
    if (canvas == nullptr) {
      throw jsi::JSError(
          runtime,
          "makeDeferredCanvas: a deferred canvas is already open on this "
          "thread; call Skia.Context.snap() before making another one");
    }
    pendingTarget() = target;
    return makeJsiObject(runtime,
                         std::make_shared<JsiSkCanvas>(getContext(), canvas));
#else
    throw jsi::JSError(runtime, "Skia.Context.makeDeferredCanvas() requires "
                                "the Graphite backend (SK_GRAPHITE)");
#endif
  }

  JSI_HOST_FUNCTION(snap) {
#if defined(SK_GRAPHITE)
    auto recording = DawnContext::getInstance().getRecorder()->snap();
    auto target = pendingTarget();
    pendingTarget().reset();
    if (!recording) {
      throw jsi::JSError(runtime, "snap: the Recorder failed to produce a "
                                  "Recording (out of memory or invalid draw)");
    }
    auto deferred = std::make_shared<RNSkDeferredRecording>();
    deferred->recording = std::move(recording);
    deferred->target = target;
    return makeJsiObject(runtime, std::make_shared<JsiSkRecording>(
                                      getContext(), std::move(deferred)));
#else
    throw jsi::JSError(runtime, "Skia.Context.snap() requires the Graphite "
                                "backend (SK_GRAPHITE)");
#endif
  }

  /**
   * Sets the scheduling priority of the calling thread: "high" for a thread
   * that produces frames (QoS user-interactive on Apple, display priority on
   * Android), "normal" or "low". Worklet runtimes start at normal priority,
   * which on big.LITTLE devices means the little cores.
   */
  void setThreadPriority(std::string level) {
    RNSkThreadPriority::set(level);
  }

  /**
   * Benchmark helper: starts native producer threads that animate the field
   * picture in the given views (see RNSkBenchmarkProducer). Options:
   * { mode: "picture" | "recording", threads, ids, picture, background }.
   * A running producer is stopped first.
   */
  JSI_HOST_FUNCTION(startProducer) {
    if (count < 1 || !arguments[0].isObject()) {
      throw jsi::JSError(runtime, "startProducer: expected an options object");
    }
    auto opts = arguments[0].asObject(runtime);
    RNSkBenchmarkProducer::Options options;
    auto mode = opts.getProperty(runtime, "mode");
    options.recording =
        mode.isString() && mode.asString(runtime).utf8(runtime) == "recording";
#if !defined(SK_GRAPHITE)
    if (options.recording) {
      throw jsi::JSError(runtime, "startProducer: the recording mode requires "
                                  "the Graphite backend (SK_GRAPHITE)");
    }
#endif
    auto threads = opts.getProperty(runtime, "threads");
    options.threads =
        threads.isNumber() ? static_cast<int>(threads.asNumber()) : 1;
    auto idsValue = opts.getProperty(runtime, "ids");
    if (!idsValue.isObject() || !idsValue.asObject(runtime).isArray(runtime)) {
      throw jsi::JSError(runtime, "startProducer: ids must be an array");
    }
    auto ids = idsValue.asObject(runtime).asArray(runtime);
    auto n = ids.size(runtime);
    for (size_t i = 0; i < n; i++) {
      auto id = ids.getValueAtIndex(runtime, i);
      options.ids.push_back(id.isNumber() ? static_cast<long>(id.asNumber())
                                          : -1);
    }
    auto pictures = opts.getProperty(runtime, "pictures");
    if (pictures.isObject() && pictures.asObject(runtime).isArray(runtime)) {
      auto array = pictures.asObject(runtime).asArray(runtime);
      auto length = array.size(runtime);
      for (size_t i = 0; i < length; i++) {
        auto value = array.getValueAtIndex(runtime, i);
        if (!value.isObject()) {
          continue;
        }
        auto picture = JsiSkPicture::fromValue(runtime, value);
        if (picture) {
          options.fields.push_back(std::move(picture));
        }
      }
    } else {
      auto pictureValue = opts.getProperty(runtime, "picture");
      if (pictureValue.isObject()) {
        auto picture = JsiSkPicture::fromValue(runtime, pictureValue);
        if (picture) {
          options.fields.push_back(std::move(picture));
        }
      }
    }
    auto scene = opts.getProperty(runtime, "scene");
    options.chart =
        scene.isString() && scene.asString(runtime).utf8(runtime) == "chart";
    auto bars = opts.getProperty(runtime, "bars");
    if (bars.isNumber()) {
      options.bars = static_cast<int>(bars.asNumber());
    }
    auto line = opts.getProperty(runtime, "line");
    if (!line.isUndefined() && !line.isNull()) {
      options.line = JsiSkColor::fromValue(runtime, line);
    }
    if (options.fields.empty() && !options.chart) {
      throw jsi::JSError(runtime, "startProducer: picture (or pictures) must "
                                  "be an SkPicture");
    }
    auto background = opts.getProperty(runtime, "background");
    if (!background.isUndefined() && !background.isNull()) {
      options.background = JsiSkColor::fromValue(runtime, background);
    }
    auto page = opts.getProperty(runtime, "page");
    if (!page.isUndefined() && !page.isNull()) {
      options.page = JsiSkColor::fromValue(runtime, page);
    }
    auto cornerRadius = opts.getProperty(runtime, "cornerRadius");
    if (cornerRadius.isNumber()) {
      options.cornerRadius = static_cast<float>(cornerRadius.asNumber());
    }
    auto kaleidoscope = opts.getProperty(runtime, "kaleidoscope");
    options.kaleidoscope = kaleidoscope.isBool() && kaleidoscope.getBool();
    auto draw = opts.getProperty(runtime, "draw");
    options.direct =
        draw.isString() && draw.asString(runtime).utf8(runtime) == "direct";
    auto svg = opts.getProperty(runtime, "svg");
    if (svg.isString()) {
      options.svg = svg.asString(runtime).utf8(runtime);
    }
    auto circles = opts.getProperty(runtime, "circles");
    if (circles.isNumber()) {
      options.circles = static_cast<int>(circles.asNumber());
    }
    auto radius = opts.getProperty(runtime, "radius");
    if (radius.isNumber()) {
      options.radius = static_cast<float>(radius.asNumber());
    }
    options.pixelDensity = getContext()->getPixelDensity();
    auto present = opts.getProperty(runtime, "present");
    options.presentOnProducer =
        present.isString() &&
        present.asString(runtime).utf8(runtime) == "producer";
    stopProducer(runtime, thisValue, nullptr, 0);
    producer() = std::make_shared<RNSkBenchmarkProducer>(getContext(),
                                                         std::move(options));
    producer()->start();
    return jsi::Value::undefined();
  }

  /** Slots the running producer should draw (booleans, in slot order). */
  JSI_HOST_FUNCTION(setProducerEnabled) {
    if (!producer() || count < 1 || !arguments[0].isObject() ||
        !arguments[0].asObject(runtime).isArray(runtime)) {
      return jsi::Value::undefined();
    }
    auto array = arguments[0].asObject(runtime).asArray(runtime);
    auto n = array.size(runtime);
    std::vector<bool> enabled(n, true);
    for (size_t i = 0; i < n; i++) {
      auto value = array.getValueAtIndex(runtime, i);
      enabled[i] = !(value.isBool() && !value.getBool());
    }
    producer()->setEnabled(enabled);
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(stopProducer) {
    if (producer()) {
      producer()->stop();
      producer().reset();
    }
    return jsi::Value::undefined();
  }

  /** { batchMs, batches, threads } of the running producer (zeros if none). */
  JSI_HOST_FUNCTION(getProducerStats) {
    RNSkBenchmarkProducer::Stats stats;
    if (producer()) {
      stats = producer()->getStats();
    }
    auto result = jsi::Object(runtime);
    result.setProperty(runtime, "batchMs", stats.batchMs);
    result.setProperty(runtime, "batches",
                       static_cast<double>(stats.batches));
    result.setProperty(runtime, "threads", stats.threads);
    return result;
  }

  // True on Graphite builds, where recordings and SkiaRecordingView exist.
  bool getIsSupported() {
#if defined(SK_GRAPHITE)
    return true;
#else
    return false;
#endif
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installHostMethod(runtime, prototype, "makeDeferredCanvas",
                      &JsiSkContext::makeDeferredCanvas);
    installHostMethod(runtime, prototype, "snap", &JsiSkContext::snap);
    installGetter(runtime, prototype, "isSupported",
                  &JsiSkContext::getIsSupported);
    installMethod(runtime, prototype, "setThreadPriority",
                  &JsiSkContext::setThreadPriority);
    installHostMethod(runtime, prototype, "startProducer",
                      &JsiSkContext::startProducer);
    installHostMethod(runtime, prototype, "stopProducer",
                      &JsiSkContext::stopProducer);
    installHostMethod(runtime, prototype, "setProducerEnabled",
                      &JsiSkContext::setProducerEnabled);
    installHostMethod(runtime, prototype, "getProducerStats",
                      &JsiSkContext::getProducerStats);
  }

private:
  // The benchmark producer, one per process (started and stopped from JS).
  static std::shared_ptr<RNSkBenchmarkProducer> &producer() {
    static std::shared_ptr<RNSkBenchmarkProducer> instance;
    return instance;
  }
#if defined(SK_GRAPHITE)
  // The target of the deferred canvas open on the calling thread, if any;
  static std::optional<RNSkDeferredTarget> &pendingTarget() {
    static thread_local std::optional<RNSkDeferredTarget> target;
    return target;
  }
#endif
};

} // namespace RNSkia
