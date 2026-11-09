#pragma once

#include <algorithm>
#include <memory>
#include <stdexcept>
#include <string>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkColor.h"
#include "JsiSkConverters.h"
#include "JsiSkNativeObjects.h"
#include "JsiSkRRect.h"
#include "JsiSkRect.h"

#include "rnskia/RNSkShapeBlob.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

/**
 * Skia.ShapeBlob(): a mutable batch of filled rectangles, rounded rectangles
 * and circles, drawn with canvas.drawShapes(blob) in one drawVertices call.
 * The setters are plain typed methods, safe to call from a worklet on the UI
 * runtime while another thread draws the blob (see RNSkShapeBlob.h).
 */
class JsiSkShapeBlob
    : public JsiSkWrappingSharedPtrNativeObject<JsiSkShapeBlob, RNSkShapeBlob> {
public:
  static constexpr const char *CLASS_NAME = "ShapeBlob";

  JsiSkShapeBlob(std::shared_ptr<RNSkPlatformContext> context,
                 std::shared_ptr<RNSkShapeBlob> blob)
      : JsiSkWrappingSharedPtrNativeObject<JsiSkShapeBlob, RNSkShapeBlob>(
            std::move(context), std::move(blob)) {}

  double addRect(std::shared_ptr<SkRect> rect, JsiColor color) {
    return checkedIndex(getObject()->addRect(*rect, color));
  }

  double addRRect(std::shared_ptr<SkRRect> rrect, JsiColor color) {
    return checkedIndex(getObject()->addRRect(*rrect, color));
  }

  double addCircle(double cx, double cy, double r, JsiColor color) {
    return checkedIndex(getObject()->addCircle(static_cast<float>(cx),
                                               static_cast<float>(cy),
                                               static_cast<float>(r), color));
  }

  void setPosition(double index, double x, double y) {
    if (index < 0 || !getObject()->setPosition(static_cast<size_t>(index),
                                               static_cast<float>(x),
                                               static_cast<float>(y))) {
      throw std::out_of_range("ShapeBlob.setPosition: index " +
                              std::to_string(static_cast<long long>(index)) +
                              " is out of range");
    }
  }

  void setColor(double index, JsiColor color) {
    if (index < 0 ||
        !getObject()->setColor(static_cast<size_t>(index), color)) {
      throw std::out_of_range("ShapeBlob.setColor: index " +
                              std::to_string(static_cast<long long>(index)) +
                              " is out of range");
    }
  }

  double getCount() { return static_cast<double>(getObject()->count()); }

  size_t getMemoryPressure() override {
    auto blob = getObjectUnchecked();
    if (!blob) {
      return kMinMemoryPressure;
    }
    return std::max(blob->approximateBytes(), kMinMemoryPressure);
  }

  static std::shared_ptr<RNSkShapeBlob> fromValue(jsi::Runtime &runtime,
                                                  const jsi::Value &obj) {
    return objectFromValue(runtime, obj);
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    installMethod(runtime, prototype, "addRect", &JsiSkShapeBlob::addRect);
    installMethod(runtime, prototype, "addRRect", &JsiSkShapeBlob::addRRect);
    installMethod(runtime, prototype, "addCircle", &JsiSkShapeBlob::addCircle);
    installMethod(runtime, prototype, "setPosition",
                  &JsiSkShapeBlob::setPosition);
    installMethod(runtime, prototype, "setColor", &JsiSkShapeBlob::setColor);
    installGetter(runtime, prototype, "count", &JsiSkShapeBlob::getCount);
  }

  /**
   * Skia.ShapeBlob(options?): `options.rasterScale` > 0 pins the scale the
   * sprites are rasterized at, in pixels per local unit (for a blob recorded
   * into a picture); omitted, it follows the device scale of the canvas.
   */
  static const jsi::HostFunctionType
  createCtor(std::shared_ptr<RNSkPlatformContext> context) {
    return JSI_HOST_FUNCTION_LAMBDA {
      float rasterScale = 0;
      if (count > 0 && arguments[0].isObject()) {
        auto scale =
            arguments[0].asObject(runtime).getProperty(runtime, "rasterScale");
        if (scale.isNumber() && scale.asNumber() > 0) {
          rasterScale = static_cast<float>(scale.asNumber());
        }
      }
      return makeJsiObject(
          runtime, std::make_shared<JsiSkShapeBlob>(
                       context, std::make_shared<RNSkShapeBlob>(rasterScale)));
    };
  }

private:
  static double checkedIndex(int index) {
    if (index < 0) {
      throw std::length_error("ShapeBlob: too many shapes");
    }
    return static_cast<double>(index);
  }
};

} // namespace RNSkia
