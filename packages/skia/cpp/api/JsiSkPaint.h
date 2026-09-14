#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "CustomBlendModes.h"
#include "JsiSkColor.h"
#include "JsiSkConverters.h"
#include "JsiSkColorFilter.h"
#include "JsiSkImageFilter.h"
#include "JsiSkMaskFilter.h"
#include "JsiSkNativeObjects.h"
#include "JsiSkPathEffect.h"
#include "JsiSkShader.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkPaint.h"

#pragma clang diagnostic pop

namespace RNSkia {
namespace jsi = facebook::jsi;

class JsiSkPaint
    : public JsiSkWrappingSharedPtrNativeObject<JsiSkPaint, SkPaint> {
public:
  static constexpr const char *CLASS_NAME = "Paint";

  void assign(std::shared_ptr<SkPaint> paint) { *getObject() = *paint; }

  std::shared_ptr<JsiSkPaint> copy() {
    const auto *paint = getObject().get();
    return std::make_shared<JsiSkPaint>(getContext(), SkPaint(*paint));
  }

  void reset() { getObject()->reset(); }

  JsiColor getColor() { return {getObject()->getColor()}; }

  double getStrokeCap() {
    return static_cast<double>(getObject()->getStrokeCap());
  }

  double getStrokeJoin() {
    return static_cast<double>(getObject()->getStrokeJoin());
  }

  double getStrokeMiter() {
    return static_cast<double>(getObject()->getStrokeMiter());
  }

  double getStrokeWidth() {
    return static_cast<double>(getObject()->getStrokeWidth());
  }

  double getAlphaf() { return SkScalarToDouble(getObject()->getAlphaf()); }

  void setColor(JsiColor color) { getObject()->setColor(color); }

  void setAlphaf(double alpha) { getObject()->setAlphaf(alpha); }

  void setAntiAlias(bool antiAliased) {
    getObject()->setAntiAlias(antiAliased);
  }

  void setDither(bool dithered) { getObject()->setDither(dithered); }

  void setStrokeWidth(double width) { getObject()->setStrokeWidth(width); }

  void setStyle(double style) {
    getObject()->setStyle(static_cast<SkPaint::Style>(style));
  }

  void setStrokeCap(double cap) {
    getObject()->setStrokeCap(static_cast<SkPaint::Cap>(cap));
  }

  void setStrokeJoin(int join) {
    getObject()->setStrokeJoin(static_cast<SkPaint::Join>(join));
  }

  void setStrokeMiter(int limit) { getObject()->setStrokeMiter(limit); }

  void setBlendMode(int blendModeValue) {
    applyBlendMode(*getObject(), blendModeValue);
  }

  void setMaskFilter(JsiOptional<sk_sp<SkMaskFilter>> maskFilter) {
    getObject()->setMaskFilter(
        maskFilter.has_value() ? std::move(*maskFilter) : nullptr);
  }

  void setImageFilter(JsiOptional<sk_sp<SkImageFilter>> imageFilter) {
    getObject()->setImageFilter(
        imageFilter.has_value() ? std::move(*imageFilter) : nullptr);
  }

  void setColorFilter(JsiOptional<sk_sp<SkColorFilter>> colorFilter) {
    getObject()->setColorFilter(
        colorFilter.has_value() ? std::move(*colorFilter) : nullptr);
  }

  void setShader(JsiOptional<sk_sp<SkShader>> shader) {
    getObject()->setShader(shader.has_value() ? std::move(*shader) : nullptr);
  }

  void setPathEffect(JsiOptional<sk_sp<SkPathEffect>> pathEffect) {
    getObject()->setPathEffect(
        pathEffect.has_value() ? std::move(*pathEffect) : nullptr);
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    installMethod(runtime, prototype, "assign", &JsiSkPaint::assign);
    installMethod(runtime, prototype, "copy", &JsiSkPaint::copy);
    installMethod(runtime, prototype, "reset", &JsiSkPaint::reset);
    installMethod(runtime, prototype, "getAlphaf", &JsiSkPaint::getAlphaf);
    installMethod(runtime, prototype, "getColor", &JsiSkPaint::getColor);
    installMethod(runtime, prototype, "getStrokeCap",
                  &JsiSkPaint::getStrokeCap);
    installMethod(runtime, prototype, "getStrokeJoin",
                  &JsiSkPaint::getStrokeJoin);
    installMethod(runtime, prototype, "getStrokeMiter",
                  &JsiSkPaint::getStrokeMiter);
    installMethod(runtime, prototype, "getStrokeWidth",
                  &JsiSkPaint::getStrokeWidth);
    installMethod(runtime, prototype, "setPathEffect",
                  &JsiSkPaint::setPathEffect);
    installMethod(runtime, prototype, "setShader", &JsiSkPaint::setShader);
    installMethod(runtime, prototype, "setColorFilter",
                  &JsiSkPaint::setColorFilter);
    installMethod(runtime, prototype, "setImageFilter",
                  &JsiSkPaint::setImageFilter);
    installMethod(runtime, prototype, "setMaskFilter",
                  &JsiSkPaint::setMaskFilter);
    installMethod(runtime, prototype, "setBlendMode",
                  &JsiSkPaint::setBlendMode);
    installMethod(runtime, prototype, "setStrokeMiter",
                  &JsiSkPaint::setStrokeMiter);
    installMethod(runtime, prototype, "setStrokeJoin",
                  &JsiSkPaint::setStrokeJoin);
    installMethod(runtime, prototype, "setStrokeCap",
                  &JsiSkPaint::setStrokeCap);
    installMethod(runtime, prototype, "setAntiAlias",
                  &JsiSkPaint::setAntiAlias);
    installMethod(runtime, prototype, "setDither", &JsiSkPaint::setDither);
    installMethod(runtime, prototype, "setStrokeWidth",
                  &JsiSkPaint::setStrokeWidth);
    installMethod(runtime, prototype, "setStyle", &JsiSkPaint::setStyle);
    installMethod(runtime, prototype, "setColor", &JsiSkPaint::setColor);
    installMethod(runtime, prototype, "setAlphaf", &JsiSkPaint::setAlphaf);
  }

  JsiSkPaint(std::shared_ptr<RNSkPlatformContext> context, SkPaint paint)
      : JsiSkWrappingSharedPtrNativeObject<JsiSkPaint, SkPaint>(
            std::move(context), std::make_shared<SkPaint>(std::move(paint))) {}

  /**
    Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<SkPaint> fromValue(jsi::Runtime &runtime,
                                            const jsi::Value &obj) {
    return objectFromValue(runtime, obj);
  }

  /**
   Copy from another paint
   */
  void fromPaint(const SkPaint &paint) {
    setObject(std::make_shared<SkPaint>(std::move(paint)));
  }

  size_t getMemoryPressure() override {
    return std::max(sizeof(SkPaint), kMinMemoryPressure);
  }

  /**
   * Creates the function for construction a new instance of the SkPaint
   * wrapper
   * @param context Platform context
   * @return A function for creating a new host object wrapper for the SkPaint
   * class
   */
  static const jsi::HostFunctionType
  createCtor(std::shared_ptr<RNSkPlatformContext> context) {
    return JSI_HOST_FUNCTION_LAMBDA {
      auto paint = SkPaint();
      paint.setAntiAlias(true);
      // Return the newly constructed object
      return makeJsiObject(runtime,
                           std::make_shared<JsiSkPaint>(context, paint));
    };
  }
};
} // namespace RNSkia
