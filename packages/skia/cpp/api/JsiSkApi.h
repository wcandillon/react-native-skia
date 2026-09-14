#pragma once

#include <memory>

#include "rnskia/RNSkPlatformContext.h"

#include "JsiSkNativeObjects.h"

#ifdef SK_GRAPHITE
#include "rnskia/RNDawnContext.h"
#endif

#include "JsiNativeBuffer.h"
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
#include "JsiVideo.h"
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
            std::make_shared<JsiSkParagraphBuilderFactory>(context)),
        _nativeBufferFactory(
            std::make_shared<JsiNativeBufferFactory>(context)) {
    // We create the system font manager eagerly since it has proven to be too
    // slow to do it on demand
    JsiSkFontMgrFactory::getFontMgr(getContext());
  }

  // Constructor functions: each delegates to the class's createCtor host
  // function using the platform context resolved from native state, so the
  // prototype stays context-free and can be installed on any runtime.
  JSI_HOST_FUNCTION(Video) {
    return JsiVideo::createCtor(getContext())(runtime, thisValue, arguments,
                                              count);
  }
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
#ifdef SK_GRAPHITE
    // Raw WGPUDevice pointer of the Graphite device, as a BigInt. Consumed by
    // react-native-webgpu's importDevice(), which AddRefs it; the pointer
    // stays owned by DawnContext and is valid for the process lifetime.
    auto &dawnContext = DawnContext::getInstance();
    return jsi::BigInt::fromUint64(
        runtime,
        reinterpret_cast<uint64_t>(dawnContext.getWGPUDevice().Get()));
#else
    throw jsi::JSError(runtime,
                       "getNativeDevice() is only available with the Graphite "
                       "backend. Rebuild with SK_GRAPHITE enabled.");
#endif
  }

  JSI_HOST_FUNCTION(Recorder) {
    return JsiRecorder::createCtor(getContext())(runtime, thisValue, arguments,
                                                 count);
  }

  // Factory properties: like the legacy HostObject implementation, each
  // property access returns a fresh JS wrapper around the shared factory
  // instance.
  std::shared_ptr<JsiSkSVGFactory> getSVGFactory() { return _svgFactory; }
  std::shared_ptr<JsiSkImageFactory> getImageFactory() {
    return _imageFactory;
  }
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
  std::shared_ptr<JsiNativeBufferFactory> getNativeBufferFactory() {
    return _nativeBufferFactory;
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installHostMethod(runtime, prototype, "Video", &JsiSkApi::Video);
    installHostMethod(runtime, prototype, "getNativeDevice",
                      &JsiSkApi::getNativeDevice);
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
    installGetter(runtime, prototype, "NativeBuffer",
                  &JsiSkApi::getNativeBufferFactory);
  }

private:
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
  std::shared_ptr<JsiNativeBufferFactory> _nativeBufferFactory;
};
} // namespace RNSkia
