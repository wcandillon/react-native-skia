#pragma once

#include <memory>
#include <utility>
#include <vector>

#include <jsi/jsi.h>

#include "JsiSkConverters.h"
#include "JsiSkNativeObjects.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkMatrix.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkMatrix
    : public JsiSkWrappingSharedPtrNativeObject<JsiSkMatrix, SkMatrix> {
public:
  static constexpr const char *CLASS_NAME = "Matrix";

  JsiSkMatrix(std::shared_ptr<RNSkPlatformContext> context, SkMatrix m)
      : JsiSkWrappingSharedPtrNativeObject<JsiSkMatrix, SkMatrix>(
            context, std::make_shared<SkMatrix>(std::move(m))) {}

  static SkMatrix getMatrix(jsi::Runtime &runtime, const jsi::Value &value) {
    const auto &object = value.asObject(runtime);
    const auto &array = object.asArray(runtime);
    if (array.size(runtime) == 9) {
      auto scaleX = array.getValueAtIndex(runtime, 0).asNumber();
      auto skewX = array.getValueAtIndex(runtime, 1).asNumber();
      auto transX = array.getValueAtIndex(runtime, 2).asNumber();
      auto skewY = array.getValueAtIndex(runtime, 3).asNumber();
      auto scaleY = array.getValueAtIndex(runtime, 4).asNumber();
      auto transY = array.getValueAtIndex(runtime, 5).asNumber();
      auto pers0 = array.getValueAtIndex(runtime, 6).asNumber();
      auto pers1 = array.getValueAtIndex(runtime, 7).asNumber();
      auto pers2 = array.getValueAtIndex(runtime, 8).asNumber();
      return SkMatrix::MakeAll(scaleX, skewX, transX, skewY, scaleY, transY,
                               pers0, pers1, pers2);
    } else if (array.size(runtime) == 16) {
      auto m11 = array.getValueAtIndex(runtime, 0).asNumber();
      auto m12 = array.getValueAtIndex(runtime, 1).asNumber();
      auto m14 = array.getValueAtIndex(runtime, 3).asNumber();
      auto m21 = array.getValueAtIndex(runtime, 4).asNumber();
      auto m22 = array.getValueAtIndex(runtime, 5).asNumber();
      auto m24 = array.getValueAtIndex(runtime, 7).asNumber();
      auto m41 = array.getValueAtIndex(runtime, 12).asNumber();
      auto m42 = array.getValueAtIndex(runtime, 13).asNumber();
      auto m44 = array.getValueAtIndex(runtime, 15).asNumber();
      return SkMatrix::MakeAll(m11, m12, m14, m21, m22, m24, m41, m42, m44);
    }
    throw jsi::JSError(runtime,
                       "Expected array of length 9 or 16 for matrix, got " +
                           std::to_string(array.size(runtime)));
  }

  void concat(std::shared_ptr<SkMatrix> matrix) {
    getObject()->preConcat(*matrix);
  }

  void translate(double x, double y) { getObject()->preTranslate(x, y); }

  void postTranslate(double x, double y) { getObject()->postTranslate(x, y); }

  // A missing y means a uniform scale, matching the CanvasKit backend and the
  // SkMatrix type, where y is optional rather than defaulted to 1.
  void scale(double x, JsiOptional<double> y) {
    getObject()->preScale(x, y.has_value() ? *y : x);
  }

  void postScale(double x, JsiOptional<double> y) {
    getObject()->postScale(x, y.has_value() ? *y : x);
  }

  void skew(double x, double y) { getObject()->preSkew(x, y); }

  void postSkew(double x, double y) { getObject()->postSkew(x, y); }

  void rotate(double a) { getObject()->preRotate(SkRadiansToDegrees(a)); }

  void postRotate(double a) { getObject()->postRotate(SkRadiansToDegrees(a)); }

  void identity() { getObject()->setIdentity(); }

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Woverloaded-virtual"
  std::vector<float> get() {
    std::vector<float> values;
    values.reserve(9);
    for (auto i = 0; i < 9; i++) {
      values.push_back(getObject()->get(i));
    }
    return values;
  }
#pragma clang diagnostic pop

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    installChainableMethod(runtime, prototype, "concat", &JsiSkMatrix::concat);
    installChainableMethod(runtime, prototype, "translate",
                           &JsiSkMatrix::translate);
    installChainableMethod(runtime, prototype, "postTranslate",
                           &JsiSkMatrix::postTranslate);
    installChainableMethod(runtime, prototype, "scale", &JsiSkMatrix::scale);
    installChainableMethod(runtime, prototype, "postScale",
                           &JsiSkMatrix::postScale);
    installChainableMethod(runtime, prototype, "skew", &JsiSkMatrix::skew);
    installChainableMethod(runtime, prototype, "postSkew",
                           &JsiSkMatrix::postSkew);
    installChainableMethod(runtime, prototype, "rotate", &JsiSkMatrix::rotate);
    installChainableMethod(runtime, prototype, "postRotate",
                           &JsiSkMatrix::postRotate);
    installChainableMethod(runtime, prototype, "identity",
                           &JsiSkMatrix::identity);
    installMethod(runtime, prototype, "get", &JsiSkMatrix::get);
  }

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<SkMatrix> fromValue(jsi::Runtime &runtime,
                                             const jsi::Value &obj) {
    auto matrix = tryGetJsiObject<JsiSkMatrix>(runtime, obj);
    if (matrix) {
      return matrix->getObject();
    } else {
      return std::make_shared<SkMatrix>(JsiSkMatrix::getMatrix(runtime, obj));
    }
  }

  size_t getMemoryPressure() override {
    return std::max(sizeof(SkMatrix), kMinMemoryPressure);
  }

  static const jsi::HostFunctionType
  createCtor(std::shared_ptr<RNSkPlatformContext> context) {
    return JSI_HOST_FUNCTION_LAMBDA {
      SkMatrix matrix;
      if (count == 1) {
        matrix = JsiSkMatrix::getMatrix(runtime, arguments[0]);
      } else {
        matrix = SkMatrix::I();
      }
      return makeJsiObject(
          runtime, std::make_shared<JsiSkMatrix>(context, std::move(matrix)));
    };
  }
};
} // namespace RNSkia
