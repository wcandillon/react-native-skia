#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkNativeObjects.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkRect.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkRect : public JsiSkWrappingSharedPtrNativeObject<JsiSkRect, SkRect> {
public:
  static constexpr const char *CLASS_NAME = "Rect";

  double getX() { return static_cast<double>(getObject()->x()); }
  double getY() { return static_cast<double>(getObject()->y()); }
  double getWidth() { return static_cast<double>(getObject()->width()); }
  double getHeight() { return static_cast<double>(getObject()->height()); }
  double getLeft() { return static_cast<double>(getObject()->left()); }
  double getTop() { return static_cast<double>(getObject()->top()); }
  double getRight() { return static_cast<double>(getObject()->right()); }
  double getBottom() { return static_cast<double>(getObject()->bottom()); }

  void setXYWH(double x, double y, double width, double height) {
    getObject()->setXYWH(x, y, width, height);
  }

  void setLTRB(double left, double top, double right, double bottom) {
    getObject()->setLTRB(left, top, right, bottom);
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    installGetter(runtime, prototype, "x", &JsiSkRect::getX);
    installGetter(runtime, prototype, "y", &JsiSkRect::getY);
    installGetter(runtime, prototype, "width", &JsiSkRect::getWidth);
    installGetter(runtime, prototype, "height", &JsiSkRect::getHeight);
    installGetter(runtime, prototype, "left", &JsiSkRect::getLeft);
    installGetter(runtime, prototype, "top", &JsiSkRect::getTop);
    installGetter(runtime, prototype, "right", &JsiSkRect::getRight);
    installGetter(runtime, prototype, "bottom", &JsiSkRect::getBottom);
    installMethod(runtime, prototype, "setXYWH", &JsiSkRect::setXYWH);
    installMethod(runtime, prototype, "setLTRB", &JsiSkRect::setLTRB);
  }

  /**
   Constructor
   */
  JsiSkRect(std::shared_ptr<RNSkPlatformContext> context, const SkRect &rect)
      : JsiSkWrappingSharedPtrNativeObject<JsiSkRect, SkRect>(
            std::move(context), std::make_shared<SkRect>(rect)) {}

  /**
    Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<SkRect> fromValue(jsi::Runtime &runtime,
                                           const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    auto rect = tryGetJsiObject<JsiSkRect>(runtime, object);
    if (rect) {
      return rect->getObject();
    } else {
      auto x = object.getProperty(runtime, "x").asNumber();
      auto y = object.getProperty(runtime, "y").asNumber();
      auto width = object.getProperty(runtime, "width").asNumber();
      auto height = object.getProperty(runtime, "height").asNumber();
      return std::make_shared<SkRect>(SkRect::MakeXYWH(x, y, width, height));
    }
  }

  /**
    Returns the jsi object from a host object of this type
   */
  static jsi::Value toValue(jsi::Runtime &runtime,
                            std::shared_ptr<RNSkPlatformContext> context,
                            const SkRect &rect) {
    return makeJsiObject(runtime,
                         std::make_shared<JsiSkRect>(std::move(context), rect));
  }
  static jsi::Value toValue(jsi::Runtime &runtime,
                            std::shared_ptr<RNSkPlatformContext> context,
                            SkRect &&rect) {
    return makeJsiObject(runtime, std::make_shared<JsiSkRect>(
                                      std::move(context), std::move(rect)));
  }

  size_t getMemoryPressure() override {
    return std::max(sizeof(SkRect), kMinMemoryPressure);
  }

  /**
   * Creates the function for construction a new instance of the SkRect
   * wrapper
   * @param context platform context
   * @return A function for creating a new host object wrapper for the SkRect
   * class
   */
  static const jsi::HostFunctionType
  createCtor(std::shared_ptr<RNSkPlatformContext> context) {
    return JSI_HOST_FUNCTION_LAMBDA {
      // Set up the rect
      SkRect rect =
          SkRect::MakeXYWH(arguments[0].asNumber(), arguments[1].asNumber(),
                           arguments[2].asNumber(), arguments[3].asNumber());

      // Return the newly constructed object
      return makeJsiObject(runtime, std::make_shared<JsiSkRect>(
                                        std::move(context), std::move(rect)));
    };
  }
};
} // namespace RNSkia
