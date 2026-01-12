#pragma once

#include <jsi/jsi.h>
#include <string>

#include "include/core/SkPath.h"
#include "include/utils/SkParsePath.h"

#include "../jsi/JSClass.h"
#include "../jsi/JSTypeTraits.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkPath2 : public RNJsi::JSClass<SkPath, JsiSkPath2> {
public:
  JsiSkPath2() = default;

  // =========================================================================
  // Path building methods (chainable - return ThisRef)
  // =========================================================================

  RNJsi::ThisRef moveTo(float x, float y) {
    getObject().moveTo(x, y);
    return {};
  }

  RNJsi::ThisRef lineTo(float x, float y) {
    getObject().lineTo(x, y);
    return {};
  }

  RNJsi::ThisRef quadTo(float x1, float y1, float x2, float y2) {
    getObject().quadTo(x1, y1, x2, y2);
    return {};
  }

  RNJsi::ThisRef cubicTo(float x1, float y1, float x2, float y2, float x3,
                         float y3) {
    getObject().cubicTo(x1, y1, x2, y2, x3, y3);
    return {};
  }

  RNJsi::ThisRef conicTo(float x1, float y1, float x2, float y2, float weight) {
    getObject().conicTo(x1, y1, x2, y2, weight);
    return {};
  }

  RNJsi::ThisRef close() {
    getObject().close();
    return {};
  }

  RNJsi::ThisRef reset() {
    getObject().reset();
    return {};
  }

  RNJsi::ThisRef rewind() {
    getObject().rewind();
    return {};
  }

  // =========================================================================
  // Query methods
  // =========================================================================

  bool isEmpty() { return getObject().isEmpty(); }

  bool isVolatile() { return getObject().isVolatile(); }

  int countPoints() { return getObject().countPoints(); }

  int countVerbs() { return getObject().countVerbs(); }

  bool contains(float x, float y) { return getObject().contains(x, y); }

  // =========================================================================
  // Conversion methods
  // =========================================================================

  std::string toSVGString() {
    return SkParsePath::ToSVGString(getObject()).c_str();
  }

  // =========================================================================
  // Method registration
  // =========================================================================

  void loadHybridMethods() override {
    // Path building (chainable)
    registerHybridMethod("moveTo", &JsiSkPath2::moveTo, this);
    registerHybridMethod("lineTo", &JsiSkPath2::lineTo, this);
    registerHybridMethod("quadTo", &JsiSkPath2::quadTo, this);
    registerHybridMethod("cubicTo", &JsiSkPath2::cubicTo, this);
    registerHybridMethod("conicTo", &JsiSkPath2::conicTo, this);
    registerHybridMethod("close", &JsiSkPath2::close, this);
    registerHybridMethod("reset", &JsiSkPath2::reset, this);
    registerHybridMethod("rewind", &JsiSkPath2::rewind, this);

    // Query methods
    registerHybridMethod("isEmpty", &JsiSkPath2::isEmpty, this);
    registerHybridMethod("isVolatile", &JsiSkPath2::isVolatile, this);
    registerHybridMethod("countPoints", &JsiSkPath2::countPoints, this);
    registerHybridMethod("countVerbs", &JsiSkPath2::countVerbs, this);
    registerHybridMethod("contains", &JsiSkPath2::contains, this);

    // Conversion
    registerHybridMethod("toSVGString", &JsiSkPath2::toSVGString, this);
  }

  size_t getMemoryPressure() const override {
    return getObject().approximateBytesUsed();
  }
};

} // namespace RNSkia
