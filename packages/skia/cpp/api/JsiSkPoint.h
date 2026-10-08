#pragma once

#include <cstring>
#include <memory>
#include <string>
#include <utility>
#include <vector>

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
   Reads a list of points into `points`, reusing its storage. The list is
   either an array of `{ x, y }` objects (plain objects or Point wrappers), or
   a Float32Array of interleaved x, y pairs, which is copied in one go. Returns
   false, leaving `points` untouched, when `value` is neither.
   */
  static bool readPoints(jsi::Runtime &runtime, const jsi::Value &value,
                         std::vector<SkPoint> &points) {
    if (!value.isObject()) {
      return false;
    }
    auto object = value.asObject(runtime);
    if (object.isArray(runtime)) {
      auto array = object.asArray(runtime);
      auto size = array.size(runtime);
      // Resolve the property names once instead of once per point.
      auto x = jsi::PropNameID::forAscii(runtime, "x");
      auto y = jsi::PropNameID::forAscii(runtime, "y");
      points.resize(size);
      for (size_t i = 0; i < size; i++) {
        auto element = array.getValueAtIndex(runtime, i);
        if (!element.isObject()) {
          throw jsi::JSError(runtime,
                             "Expected a point at index " + std::to_string(i));
        }
        auto point = element.asObject(runtime);
        auto px = point.getProperty(runtime, x);
        auto py = point.getProperty(runtime, y);
        if (!px.isNumber() || !py.isNumber()) {
          throw jsi::JSError(runtime,
                             "Expected a point at index " + std::to_string(i));
        }
        points[i] = SkPoint::Make(static_cast<float>(px.getNumber()),
                                  static_cast<float>(py.getNumber()));
      }
      return true;
    }
    return readFloat32Array(runtime, object, points);
  }

  /**
   Copies a Float32Array of interleaved x, y pairs into `points`, reusing its
   storage. Returns false when `object` is not a Float32Array.
   */
  static bool readFloat32Array(jsi::Runtime &runtime, const jsi::Object &object,
                               std::vector<SkPoint> &points) {
    static_assert(sizeof(SkPoint) == 2 * sizeof(float),
                  "SkPoint must be two packed floats");
    auto float32Array = runtime.global().getProperty(runtime, "Float32Array");
    if (!float32Array.isObject() ||
        !object.instanceOf(
            runtime, float32Array.asObject(runtime).asFunction(runtime))) {
      return false;
    }
    auto length =
        static_cast<size_t>(object.getProperty(runtime, "length").asNumber());
    if (length % 2 != 0) {
      throw jsi::JSError(runtime,
                         "A Float32Array of points must hold x, y pairs");
    }
    auto byteOffset = static_cast<size_t>(
        object.getProperty(runtime, "byteOffset").asNumber());
    auto buffer = object.getProperty(runtime, "buffer")
                      .asObject(runtime)
                      .getArrayBuffer(runtime);
    points.resize(length / 2);
    if (length > 0) {
      std::memcpy(points.data(), buffer.data(runtime) + byteOffset,
                  length * sizeof(float));
    }
    return true;
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
