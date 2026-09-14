#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkNativeObjects.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkPoint.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkPoint
    : public JsiSkWrappingSharedPtrNativeObject<JsiSkPoint, SkPoint> {
public:
  static constexpr const char *CLASS_NAME = "Point";

  double getX() { return static_cast<double>(getObject()->x()); }

  double getY() { return static_cast<double>(getObject()->y()); }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    installGetter(runtime, prototype, "x", &JsiSkPoint::getX);
    installGetter(runtime, prototype, "y", &JsiSkPoint::getY);
  }

  JsiSkPoint(std::shared_ptr<RNSkPlatformContext> context, const SkPoint &point)
      : JsiSkWrappingSharedPtrNativeObject<JsiSkPoint, SkPoint>(
            std::move(context), std::make_shared<SkPoint>(point)) {}

  /**
  Returns the underlying object from a host object of this type
 */
  static std::shared_ptr<SkPoint> fromValue(jsi::Runtime &runtime,
                                            const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    auto point = tryGetJsiObject<JsiSkPoint>(runtime, object);
    if (point) {
      return point->getObject();
    } else {
      auto x = object.getProperty(runtime, "x").asNumber();
      auto y = object.getProperty(runtime, "y").asNumber();
      return std::make_shared<SkPoint>(SkPoint::Make(x, y));
    }
  }

  /**
  Returns the jsi object from a host object of this type
 */
  static jsi::Value toValue(jsi::Runtime &runtime,
                            std::shared_ptr<RNSkPlatformContext> context,
                            const SkPoint &point) {
    return makeJsiObject(
        runtime, std::make_shared<JsiSkPoint>(std::move(context), point));
  }

  size_t getMemoryPressure() override {
    return std::max(sizeof(SkPoint), kMinMemoryPressure);
  }

  /**
   * Creates the function for construction a new instance of the SkPoint
   * wrapper
   * @param context platform context
   * @return A function for creating a new host object wrapper for the SkPoint
   * class
   */
  static const jsi::HostFunctionType
  createCtor(std::shared_ptr<RNSkPlatformContext> context) {
    return JSI_HOST_FUNCTION_LAMBDA {
      auto point =
          SkPoint::Make(arguments[0].asNumber(), arguments[1].asNumber());

      // Return the newly constructed object
      return makeJsiObject(runtime, std::make_shared<JsiSkPoint>(
                                        std::move(context), std::move(point)));
    };
  }
};
} // namespace RNSkia
