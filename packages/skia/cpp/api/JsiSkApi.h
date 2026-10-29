#pragma once

#include <memory>
#include <mutex>
#include <optional>
#include <string>
#include <utility>
#include <vector>

#include "rnskia/RNSkPlatformContext.h"

#include "JsiSkNativeObjects.h"
#include "jsi/JsiPromises.h"
#include "rnskia/RNSkRuntimeScheduler.h"

#include "rnskia/RNDawnContext.h"

#include "JsiSkAnimatedImage.h"
#include "JsiSkAnimatedImageFactory.h"
#include "JsiSkColor.h"
#include "JsiSkColorFilter.h"
#include "JsiSkColorFilterFactory.h"
#include "JsiSkContourMeasureIter.h"
#include "JsiSkDataFactory.h"
#include "JsiSkFont.h"
#include "JsiSkFontMgr.h"
#include "JsiSkFontMgrFactory.h"
#include "JsiSkImage.h"
#include "JsiSkImageFactory.h"
#include "JsiSkImageFilter.h"
#include "JsiSkImageFilterFactory.h"
#include "JsiSkMaskFilter.h"
#include "JsiSkMaskFilterFactory.h"
#include "JsiSkMatrix.h"
#include "JsiSkPaint.h"
#include "JsiSkParagraphBuilder.h"
#include "JsiSkParagraphBuilderFactory.h"
#include "JsiSkPath.h"
#include "JsiSkPathBuilder.h"
#include "JsiSkPathBuilderFactory.h"
#include "JsiSkPathEffect.h"
#include "JsiSkPathEffectFactory.h"
#include "JsiSkPathFactory.h"
#include "JsiSkPictureFactory.h"
#include "JsiSkPictureRecorder.h"
#include "JsiSkPoint.h"
#include "JsiSkRRect.h"
#include "JsiSkRSXform.h"
#include "JsiSkRect.h"
#include "JsiSkRuntimeEffect.h"
#include "JsiSkRuntimeEffectFactory.h"
#include "JsiSkRuntimeShaderBuilder.h"
#include "JsiSkSVG.h"
#include "JsiSkSVGFactory.h"
#include "JsiSkShader.h"
#include "JsiSkShaderFactory.h"
#include "JsiSkSurfaceFactory.h"
#include "JsiSkTextBlobFactory.h"
#include "JsiSkTypeface.h"
#include "JsiSkTypefaceFactory.h"
#include "JsiSkTypefaceFontProviderFactory.h"
#include "JsiSkVertices.h"
#include "JsiSkottieFactory.h"
#include "api/recorder/JsiRecorder.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkApi : public JsiSkNativeObject<JsiSkApi> {
public:
  static constexpr const char *CLASS_NAME = "Api";

  size_t getMemoryPressure() override { return 8192; }

  /**
   * Constructs the Skia Api object that can be installed into a runtime
   * and provide functions for accessing and creating the Skia wrapper objects
   * @param context Platform context
   */
  explicit JsiSkApi(const std::shared_ptr<RNSkPlatformContext> &context)
      : JsiSkNativeObject<JsiSkApi>(context),
        _svgFactory(std::make_shared<JsiSkSVGFactory>(context)),
        _imageFactory(std::make_shared<JsiSkImageFactory>(context)),
        _animatedImageFactory(
            std::make_shared<JsiSkAnimatedImageFactory>(context)),
        _typefaceFactory(std::make_shared<JsiSkTypefaceFactory>(context)),
        _dataFactory(std::make_shared<JsiSkDataFactory>(context)),
        _imageFilterFactory(std::make_shared<JsiSkImageFilterFactory>(context)),
        _pathEffectFactory(std::make_shared<JsiSkPathEffectFactory>(context)),
        _pathFactory(std::make_shared<JsiSkPathFactory>(context)),
        _pathBuilderFactory(std::make_shared<JsiSkPathBuilderFactory>(context)),
        _colorFilterFactory(std::make_shared<JsiSkColorFilterFactory>(context)),
        _maskFilterFactory(std::make_shared<JsiSkMaskFilterFactory>(context)),
        _runtimeEffectFactory(
            std::make_shared<JsiSkRuntimeEffectFactory>(context)),
        _shaderFactory(std::make_shared<JsiSkShaderFactory>(context)),
        _textBlobFactory(std::make_shared<JsiSkTextBlobFactory>(context)),
        _surfaceFactory(std::make_shared<JsiSkSurfaceFactory>(context)),
        _pictureFactory(std::make_shared<JsiSkPictureFactory>(context)),
        _fontMgrFactory(std::make_shared<JsiSkFontMgrFactory>(context)),
        _skottieFactory(std::make_shared<JsiSkottieFactory>(context)),
        _typefaceFontProviderFactory(
            std::make_shared<JsiSkTypefaceFontProviderFactory>(context)),
        _paragraphBuilderFactory(
            std::make_shared<JsiSkParagraphBuilderFactory>(context)) {
    // We create the system font manager eagerly since it has proven to be too
    // slow to do it on demand
    JsiSkFontMgrFactory::getFontMgr(getContext());
  }

  // Constructor functions: each delegates to the class's createCtor host
  // function using the platform context resolved from native state, so the
  // prototype stays context-free and can be installed on any runtime.
  JSI_HOST_FUNCTION(Font) {
    return JsiSkFont::createCtor(getContext())(runtime, thisValue, arguments,
                                               count);
  }
  JSI_HOST_FUNCTION(Paint) {
    return JsiSkPaint::createCtor(getContext())(runtime, thisValue, arguments,
                                                count);
  }
  JSI_HOST_FUNCTION(RSXform) {
    return JsiSkRSXform::createCtor(getContext())(runtime, thisValue, arguments,
                                                  count);
  }
  JSI_HOST_FUNCTION(RSXformFromRadians) {
    return JsiSkRSXform::createCtorFromRadians(getContext())(runtime, thisValue,
                                                             arguments, count);
  }
  JSI_HOST_FUNCTION(Matrix) {
    return JsiSkMatrix::createCtor(getContext())(runtime, thisValue, arguments,
                                                 count);
  }
  JSI_HOST_FUNCTION(XYWHRect) {
    return JsiSkRect::createCtor(getContext())(runtime, thisValue, arguments,
                                               count);
  }
  JSI_HOST_FUNCTION(RRectXY) {
    return JsiSkRRect::createCtor(getContext())(runtime, thisValue, arguments,
                                                count);
  }
  JSI_HOST_FUNCTION(Point) {
    return JsiSkPoint::createCtor(getContext())(runtime, thisValue, arguments,
                                                count);
  }
  JSI_HOST_FUNCTION(RuntimeShaderBuilder) {
    return JsiSkRuntimeShaderBuilder::createCtor(getContext())(
        runtime, thisValue, arguments, count);
  }
  JSI_HOST_FUNCTION(ContourMeasureIter) {
    return JsiSkContourMeasureIter::createCtor(getContext())(runtime, thisValue,
                                                             arguments, count);
  }
  JSI_HOST_FUNCTION(MakeVertices) {
    return JsiSkVertices::createCtor(getContext())(runtime, thisValue,
                                                   arguments, count);
  }
  JSI_HOST_FUNCTION(PictureRecorder) {
    return JsiSkPictureRecorder::createCtor(getContext())(runtime, thisValue,
                                                          arguments, count);
  }
  JSI_HOST_FUNCTION(Color) {
    return JsiSkColor::createCtor()(runtime, thisValue, arguments, count);
  }
  JSI_HOST_FUNCTION(getNativeDevice) {
    // Raw WGPUDevice pointer of the Graphite device, as a BigInt. Consumed by
    // react-native-webgpu's importDevice(), which AddRefs it; the pointer
    // stays owned by DawnContext and is valid for the process lifetime. It
    // is the device in use: a lost one is replaced (see DawnContext), and
    // Skia.gpu.lost tells JS to import the new one.
    auto &dawnContext = DawnContext::getInstance();
    return jsi::BigInt::fromUint64(
        runtime, reinterpret_cast<uint64_t>(dawnContext.getWGPUDevice().Get()));
  }

  JSI_HOST_FUNCTION(Recorder) {
    return JsiRecorder::createCtor(getContext())(runtime, thisValue, arguments,
                                                 count);
  }

  // The GPU Skia renders with, or why there is none (Skia.gpu, see
  // src/skia/types/Skia.ts). A fresh object per read, of plain values, and
  // the promise of the device's loss (see getLostPromise).
  jsi::Value getGpu(jsi::Runtime &runtime) {
    const auto &gpu = DawnContext::getGpuInfo();
    auto string = [&runtime](const std::string &value) {
      return jsi::String::createFromUtf8(runtime, value);
    };
    jsi::Object result(runtime);
    result.setProperty(runtime, "isAvailable", gpu.available);
    result.setProperty(runtime, "backend", string(gpu.adapter.backend));
    result.setProperty(runtime, "vendor", string(gpu.adapter.vendor));
    result.setProperty(runtime, "architecture",
                       string(gpu.adapter.architecture));
    result.setProperty(runtime, "device", string(gpu.adapter.device));
    result.setProperty(runtime, "description", string(gpu.adapter.description));
    result.setProperty(runtime, "error",
                       gpu.available ? jsi::Value::null()
                                     : jsi::Value(runtime, string(gpu.error)));
    result.setProperty(runtime, "lost",
                       getLostPromise(runtime, gpu.generation));
    return result;
  }

  // Factory properties: like the legacy HostObject implementation, each
  // property access returns a fresh JS wrapper around the shared factory
  // instance.
  std::shared_ptr<JsiSkSVGFactory> getSVGFactory() { return _svgFactory; }
  std::shared_ptr<JsiSkImageFactory> getImageFactory() { return _imageFactory; }
  std::shared_ptr<JsiSkAnimatedImageFactory> getAnimatedImageFactory() {
    return _animatedImageFactory;
  }
  std::shared_ptr<JsiSkTypefaceFactory> getTypefaceFactory() {
    return _typefaceFactory;
  }
  std::shared_ptr<JsiSkDataFactory> getDataFactory() { return _dataFactory; }
  std::shared_ptr<JsiSkImageFilterFactory> getImageFilterFactory() {
    return _imageFilterFactory;
  }
  std::shared_ptr<JsiSkPathEffectFactory> getPathEffectFactory() {
    return _pathEffectFactory;
  }
  std::shared_ptr<JsiSkPathFactory> getPathFactory() { return _pathFactory; }
  std::shared_ptr<JsiSkPathBuilderFactory> getPathBuilderFactory() {
    return _pathBuilderFactory;
  }
  std::shared_ptr<JsiSkColorFilterFactory> getColorFilterFactory() {
    return _colorFilterFactory;
  }
  std::shared_ptr<JsiSkMaskFilterFactory> getMaskFilterFactory() {
    return _maskFilterFactory;
  }
  std::shared_ptr<JsiSkRuntimeEffectFactory> getRuntimeEffectFactory() {
    return _runtimeEffectFactory;
  }
  std::shared_ptr<JsiSkShaderFactory> getShaderFactory() {
    return _shaderFactory;
  }
  std::shared_ptr<JsiSkTextBlobFactory> getTextBlobFactory() {
    return _textBlobFactory;
  }
  std::shared_ptr<JsiSkSurfaceFactory> getSurfaceFactory() {
    return _surfaceFactory;
  }
  std::shared_ptr<JsiSkPictureFactory> getPictureFactory() {
    return _pictureFactory;
  }
  std::shared_ptr<JsiSkFontMgrFactory> getFontMgrFactory() {
    return _fontMgrFactory;
  }
  std::shared_ptr<JsiSkottieFactory> getSkottieFactory() {
    return _skottieFactory;
  }
  std::shared_ptr<JsiSkTypefaceFontProviderFactory>
  getTypefaceFontProviderFactory() {
    return _typefaceFontProviderFactory;
  }
  std::shared_ptr<JsiSkParagraphBuilderFactory> getParagraphBuilderFactory() {
    return _paragraphBuilderFactory;
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installHostMethod(runtime, prototype, "getNativeDevice",
                      &JsiSkApi::getNativeDevice);
    installGetterWithRuntime(runtime, prototype, "gpu", &JsiSkApi::getGpu);
    installHostMethod(runtime, prototype, "Font", &JsiSkApi::Font);
    installHostMethod(runtime, prototype, "Paint", &JsiSkApi::Paint);
    installHostMethod(runtime, prototype, "RSXform", &JsiSkApi::RSXform);
    installHostMethod(runtime, prototype, "RSXformFromRadians",
                      &JsiSkApi::RSXformFromRadians);
    installHostMethod(runtime, prototype, "Matrix", &JsiSkApi::Matrix);
    installHostMethod(runtime, prototype, "XYWHRect", &JsiSkApi::XYWHRect);
    installHostMethod(runtime, prototype, "RRectXY", &JsiSkApi::RRectXY);
    installHostMethod(runtime, prototype, "Point", &JsiSkApi::Point);
    installHostMethod(runtime, prototype, "RuntimeShaderBuilder",
                      &JsiSkApi::RuntimeShaderBuilder);
    installHostMethod(runtime, prototype, "ContourMeasureIter",
                      &JsiSkApi::ContourMeasureIter);
    installHostMethod(runtime, prototype, "MakeVertices",
                      &JsiSkApi::MakeVertices);
    installHostMethod(runtime, prototype, "PictureRecorder",
                      &JsiSkApi::PictureRecorder);
    installHostMethod(runtime, prototype, "Color", &JsiSkApi::Color);
    installHostMethod(runtime, prototype, "Recorder", &JsiSkApi::Recorder);
    installGetter(runtime, prototype, "SVG", &JsiSkApi::getSVGFactory);
    installGetter(runtime, prototype, "Image", &JsiSkApi::getImageFactory);
    installGetter(runtime, prototype, "AnimatedImage",
                  &JsiSkApi::getAnimatedImageFactory);
    installGetter(runtime, prototype, "Typeface",
                  &JsiSkApi::getTypefaceFactory);
    installGetter(runtime, prototype, "Data", &JsiSkApi::getDataFactory);
    installGetter(runtime, prototype, "ImageFilter",
                  &JsiSkApi::getImageFilterFactory);
    installGetter(runtime, prototype, "PathEffect",
                  &JsiSkApi::getPathEffectFactory);
    installGetter(runtime, prototype, "Path", &JsiSkApi::getPathFactory);
    installGetter(runtime, prototype, "PathBuilder",
                  &JsiSkApi::getPathBuilderFactory);
    installGetter(runtime, prototype, "ColorFilter",
                  &JsiSkApi::getColorFilterFactory);
    installGetter(runtime, prototype, "MaskFilter",
                  &JsiSkApi::getMaskFilterFactory);
    installGetter(runtime, prototype, "RuntimeEffect",
                  &JsiSkApi::getRuntimeEffectFactory);
    installGetter(runtime, prototype, "Shader", &JsiSkApi::getShaderFactory);
    installGetter(runtime, prototype, "TextBlob",
                  &JsiSkApi::getTextBlobFactory);
    installGetter(runtime, prototype, "Surface", &JsiSkApi::getSurfaceFactory);
    installGetter(runtime, prototype, "Picture", &JsiSkApi::getPictureFactory);
    installGetter(runtime, prototype, "FontMgr", &JsiSkApi::getFontMgrFactory);
    installGetter(runtime, prototype, "Skottie", &JsiSkApi::getSkottieFactory);
    installGetter(runtime, prototype, "TypefaceFontProvider",
                  &JsiSkApi::getTypefaceFontProviderFactory);
    installGetter(runtime, prototype, "ParagraphBuilder",
                  &JsiSkApi::getParagraphBuilderFactory);
  }

private:
  /**
   Skia.gpu.lost: the promise of the loss of the device in use, one per
   device and per runtime (like WebGPU's GPUDevice.lost, the same promise for
   every read while the device is in use), resolved on the runtime that read
   it once React Native Skia has tried to replace the device. `generation` is
   the device Skia.gpu describes (see DawnContext::generation()); 0 without
   a GPU, whose promise never resolves. The pending promise is kept in the
   runtime's runtimeData, so that it goes with the runtime, and settled
   through the runtime's scheduler (see RNSkRuntimeScheduler); on a worklet
   runtime of the app's own, which polls for its results only while it waits
   for some, the loss is delivered with the next such wait.
   */
  jsi::Value getLostPromise(jsi::Runtime &runtime, uint64_t generation) {
    static const jsi::UUID kSlot(0x7c2a3b4e, 0x6b5f, 0x11f0, 0x8d4b,
                                 0x0242ac120003ULL);
    auto slot =
        std::static_pointer_cast<LostPromise>(runtime.getRuntimeData(kSlot));
    if (slot == nullptr) {
      slot = std::make_shared<LostPromise>();
      runtime.setRuntimeData(kSlot, slot);
      auto &registry = lostPromises();
      std::lock_guard<std::mutex> lock(registry.mutex);
      registry.entries.push_back(
          {slot, RNSkRuntimeScheduler::get(runtime, getContext())});
      if (!registry.listening) {
        // Told of every loss, on the thread that replaced the device: each
        // runtime settles its own promise on its own thread.
        registry.listening = true;
        DawnContext::addLossListener([](const DawnContext::LossInfo &info) {
          notifyLostPromises(info);
        });
      }
    }
    if (slot->value.has_value() && slot->generation == generation) {
      return jsi::Value(runtime, *slot->value);
    }
    std::shared_ptr<RNJsi::JsiPromises::Promise> promise;
    auto value = RNJsi::JsiPromises::createPromiseAsJSIValue(
        runtime,
        [&promise](jsi::Runtime &,
                   std::shared_ptr<RNJsi::JsiPromises::Promise> created) {
          promise = std::move(created);
        });
    slot->generation = generation;
    slot->promise = std::move(promise);
    slot->value.emplace(runtime, value);
    return value;
  }

private:
  /** The pending Skia.gpu.lost of one runtime; owned by the runtime. */
  struct LostPromise {
    uint64_t generation = 0;
    std::shared_ptr<RNJsi::JsiPromises::Promise> promise;
    std::optional<jsi::Value> value;
  };

  struct LostPromises {
    std::mutex mutex;
    bool listening = false;
    std::vector<std::pair<std::weak_ptr<LostPromise>,
                          std::weak_ptr<RNSkRuntimeScheduler>>>
        entries;
  };

  // Never destroyed: a loss may be reported during process teardown.
  static LostPromises &lostPromises() {
    static auto *registry = new LostPromises();
    return *registry;
  }

  // Settles the promise of the lost device on every runtime that holds one.
  // Any thread; the slots and schedulers of runtimes gone since are skipped
  // and forgotten.
  static void notifyLostPromises(const DawnContext::LossInfo &info) {
    auto &registry = lostPromises();
    std::lock_guard<std::mutex> lock(registry.mutex);
    for (auto it = registry.entries.begin(); it != registry.entries.end();) {
      auto scheduler = it->second.lock();
      if (it->first.expired() || scheduler == nullptr) {
        it = registry.entries.erase(it);
        continue;
      }
      // The slot is captured weakly: it dies with its runtime, on that
      // runtime's thread, not with a job dropped elsewhere.
      scheduler->post([weakSlot = it->first, info](jsi::Runtime &runtime) {
        auto slot = weakSlot.lock();
        if (slot == nullptr || slot->promise == nullptr ||
            slot->generation != info.generation) {
          return;
        }
        auto promise = std::move(slot->promise);
        slot->value.reset();
        jsi::Object result(runtime);
        result.setProperty(runtime, "reason",
                           jsi::String::createFromUtf8(runtime, info.reason));
        result.setProperty(runtime, "message",
                           jsi::String::createFromUtf8(runtime, info.message));
        promise->resolve(jsi::Value(runtime, result));
      });
      ++it;
    }
  }

  std::shared_ptr<JsiSkSVGFactory> _svgFactory;
  std::shared_ptr<JsiSkImageFactory> _imageFactory;
  std::shared_ptr<JsiSkAnimatedImageFactory> _animatedImageFactory;
  std::shared_ptr<JsiSkTypefaceFactory> _typefaceFactory;
  std::shared_ptr<JsiSkDataFactory> _dataFactory;
  std::shared_ptr<JsiSkImageFilterFactory> _imageFilterFactory;
  std::shared_ptr<JsiSkPathEffectFactory> _pathEffectFactory;
  std::shared_ptr<JsiSkPathFactory> _pathFactory;
  std::shared_ptr<JsiSkPathBuilderFactory> _pathBuilderFactory;
  std::shared_ptr<JsiSkColorFilterFactory> _colorFilterFactory;
  std::shared_ptr<JsiSkMaskFilterFactory> _maskFilterFactory;
  std::shared_ptr<JsiSkRuntimeEffectFactory> _runtimeEffectFactory;
  std::shared_ptr<JsiSkShaderFactory> _shaderFactory;
  std::shared_ptr<JsiSkTextBlobFactory> _textBlobFactory;
  std::shared_ptr<JsiSkSurfaceFactory> _surfaceFactory;
  std::shared_ptr<JsiSkPictureFactory> _pictureFactory;
  std::shared_ptr<JsiSkFontMgrFactory> _fontMgrFactory;
  std::shared_ptr<JsiSkottieFactory> _skottieFactory;
  std::shared_ptr<JsiSkTypefaceFontProviderFactory>
      _typefaceFontProviderFactory;
  std::shared_ptr<JsiSkParagraphBuilderFactory> _paragraphBuilderFactory;
};
} // namespace RNSkia
