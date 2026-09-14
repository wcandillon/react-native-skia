#pragma once

#include <memory>
#include <utility>
#include <vector>

#include <jsi/jsi.h>

#include "JsiSkConverters.h"
#include "JsiSkMatrix.h"
#include "JsiSkNativeObjects.h"
#include "JsiSkPath.h"
#include "JsiSkPoint.h"
#include "JsiSkRRect.h"
#include "JsiSkRect.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkPath.h"
#include "include/core/SkPathBuilder.h"
#include "include/core/SkPathTypes.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkPathBuilder
    : public JsiSkWrappingSharedPtrNativeObject<JsiSkPathBuilder,
                                                SkPathBuilder> {
public:
  static constexpr const char *CLASS_NAME = "PathBuilder";

  // Movement methods
  void moveTo(double x, double y) { getObject()->moveTo(x, y); }

  void rMoveTo(double x, double y) {
    getObject()->rMoveTo({static_cast<SkScalar>(x), static_cast<SkScalar>(y)});
  }

  void lineTo(double x, double y) { getObject()->lineTo(x, y); }

  void rLineTo(double x, double y) { getObject()->rLineTo(x, y); }

  // Curve methods
  void quadTo(double x1, double y1, double x2, double y2) {
    getObject()->quadTo(x1, y1, x2, y2);
  }

  void rQuadTo(double x1, double y1, double x2, double y2) {
    getObject()->rQuadTo(x1, y1, x2, y2);
  }

  void conicTo(double x1, double y1, double x2, double y2, double w) {
    getObject()->conicTo(x1, y1, x2, y2, w);
  }

  void rConicTo(double x1, double y1, double x2, double y2, double w) {
    getObject()->rConicTo(x1, y1, x2, y2, w);
  }

  void cubicTo(double x1, double y1, double x2, double y2, double x3,
               double y3) {
    getObject()->cubicTo(x1, y1, x2, y2, x3, y3);
  }

  void rCubicTo(double x1, double y1, double x2, double y2, double x3,
                double y3) {
    getObject()->rCubicTo(x1, y1, x2, y2, x3, y3);
  }

  void close() { getObject()->close(); }

  // Arc methods
  void arcToOval(std::shared_ptr<SkRect> rect, double start, double sweep,
                 bool forceMoveTo) {
    getObject()->arcTo(*rect, start, sweep, forceMoveTo);
  }

  void arcToRotated(double rx, double ry, double xAxisRotate, bool useSmallArc,
                    bool isCCW, double x, double y) {
    auto arcSize = useSmallArc ? SkPathBuilder::ArcSize::kSmall_ArcSize
                               : SkPathBuilder::ArcSize::kLarge_ArcSize;
    auto sweep = isCCW ? SkPathDirection::kCCW : SkPathDirection::kCW;
    getObject()->arcTo(SkPoint::Make(rx, ry), xAxisRotate, arcSize, sweep,
                       SkPoint::Make(x, y));
  }

  void rArcTo(double rx, double ry, double xAxisRotate, bool useSmallArc,
              bool isCCW, double dx, double dy) {
    auto arcSize = useSmallArc ? SkPathBuilder::ArcSize::kSmall_ArcSize
                               : SkPathBuilder::ArcSize::kLarge_ArcSize;
    auto sweep = isCCW ? SkPathDirection::kCCW : SkPathDirection::kCW;
    SkPoint r(rx, ry);
    SkVector d(dx, dy);
    getObject()->rArcTo(r, xAxisRotate, arcSize, sweep, d);
  }

  void arcToTangent(double x1, double y1, double x2, double y2, double r) {
    getObject()->arcTo(SkPoint::Make(x1, y1), SkPoint::Make(x2, y2), r);
  }

  // Shape methods
  void addRect(std::shared_ptr<SkRect> rect, JsiOptional<bool> isCCW) {
    getObject()->addRect(*rect, toDirection(isCCW));
  }

  void addOval(std::shared_ptr<SkRect> rect, JsiOptional<bool> isCCW,
               JsiOptional<double> startIndex) {
    getObject()->addOval(*rect, toDirection(isCCW),
                         startIndex.has_value()
                             ? static_cast<unsigned>(*startIndex)
                             : 0);
  }

  void addArc(std::shared_ptr<SkRect> rect, double start, double sweep) {
    getObject()->addArc(*rect, start, sweep);
  }

  void addRRect(std::shared_ptr<SkRRect> rrect, JsiOptional<bool> isCCW) {
    getObject()->addRRect(*rrect, toDirection(isCCW));
  }

  void addCircle(double x, double y, double r, JsiOptional<bool> isCCW) {
    getObject()->addCircle(x, y, r, toDirection(isCCW));
  }

  void addPoly(std::vector<SkPoint> points, bool close) {
    getObject()->addPolygon(SkSpan(points.data(), points.size()), close);
  }

  void addPath(std::shared_ptr<SkPathBuilder> src,
               JsiOptional<std::shared_ptr<SkMatrix>> matrix,
               JsiOptional<bool> extend) {
    auto srcPath = src->snapshot();
    auto mode = extend.has_value() && *extend ? SkPath::kExtend_AddPathMode
                                              : SkPath::kAppend_AddPathMode;
    if (matrix.has_value()) {
      getObject()->addPath(srcPath, **matrix, mode);
    } else {
      getObject()->addPath(srcPath, mode);
    }
  }

  // Configuration methods
  void setFillType(double ft) {
    getObject()->setFillType(static_cast<SkPathFillType>(ft));
  }

  void setIsVolatile(bool v) { getObject()->setIsVolatile(v); }

  void reset() { getObject()->reset(); }

  void offset(double dx, double dy) { getObject()->offset(dx, dy); }

  void transform(std::shared_ptr<SkMatrix> m3) {
    // Create a path from current state, transform, then rebuild
    auto path = getObject()->snapshot().makeTransform(*m3);
    *getObject() = SkPathBuilder(path);
  }

  // Query methods
  std::shared_ptr<JsiSkRect> computeBounds() {
    auto path = getObject()->snapshot();
    return std::make_shared<JsiSkRect>(getContext(), path.getBounds());
  }

  bool isEmpty() { return getObject()->snapshot().isEmpty(); }

  SkPoint getLastPt() {
    SkPoint last = SkPoint::Make(0, 0);
    getObject()->snapshot().getLastPt(&last);
    return last;
  }

  int countPoints() { return getObject()->snapshot().countPoints(); }

  // Build methods
  std::shared_ptr<JsiSkPath> build() {
    // snapshot() returns a copy without resetting the builder
    auto path = getObject()->snapshot();
    return std::make_shared<JsiSkPath>(getContext(), std::move(path));
  }

  std::shared_ptr<JsiSkPath> detach() {
    // detach() returns the path and resets the builder
    auto path = getObject()->detach();
    return std::make_shared<JsiSkPath>(getContext(), std::move(path));
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    // Movement
    installChainableMethod(runtime, prototype, "moveTo",
                           &JsiSkPathBuilder::moveTo);
    installChainableMethod(runtime, prototype, "rMoveTo",
                           &JsiSkPathBuilder::rMoveTo);
    installChainableMethod(runtime, prototype, "lineTo",
                           &JsiSkPathBuilder::lineTo);
    installChainableMethod(runtime, prototype, "rLineTo",
                           &JsiSkPathBuilder::rLineTo);
    // Curves
    installChainableMethod(runtime, prototype, "quadTo",
                           &JsiSkPathBuilder::quadTo);
    installChainableMethod(runtime, prototype, "rQuadTo",
                           &JsiSkPathBuilder::rQuadTo);
    installChainableMethod(runtime, prototype, "conicTo",
                           &JsiSkPathBuilder::conicTo);
    installChainableMethod(runtime, prototype, "rConicTo",
                           &JsiSkPathBuilder::rConicTo);
    installChainableMethod(runtime, prototype, "cubicTo",
                           &JsiSkPathBuilder::cubicTo);
    installChainableMethod(runtime, prototype, "rCubicTo",
                           &JsiSkPathBuilder::rCubicTo);
    installChainableMethod(runtime, prototype, "close",
                           &JsiSkPathBuilder::close);
    // Arcs
    installChainableMethod(runtime, prototype, "arcToOval",
                           &JsiSkPathBuilder::arcToOval);
    installChainableMethod(runtime, prototype, "arcToRotated",
                           &JsiSkPathBuilder::arcToRotated);
    installChainableMethod(runtime, prototype, "rArcTo",
                           &JsiSkPathBuilder::rArcTo);
    installChainableMethod(runtime, prototype, "arcToTangent",
                           &JsiSkPathBuilder::arcToTangent);
    // Shapes
    installChainableMethod(runtime, prototype, "addRect",
                           &JsiSkPathBuilder::addRect);
    installChainableMethod(runtime, prototype, "addOval",
                           &JsiSkPathBuilder::addOval);
    installChainableMethod(runtime, prototype, "addArc",
                           &JsiSkPathBuilder::addArc);
    installChainableMethod(runtime, prototype, "addRRect",
                           &JsiSkPathBuilder::addRRect);
    installChainableMethod(runtime, prototype, "addCircle",
                           &JsiSkPathBuilder::addCircle);
    installChainableMethod(runtime, prototype, "addPoly",
                           &JsiSkPathBuilder::addPoly);
    installChainableMethod(runtime, prototype, "addPath",
                           &JsiSkPathBuilder::addPath);
    // Config
    installChainableMethod(runtime, prototype, "setFillType",
                           &JsiSkPathBuilder::setFillType);
    installChainableMethod(runtime, prototype, "setIsVolatile",
                           &JsiSkPathBuilder::setIsVolatile);
    installChainableMethod(runtime, prototype, "reset",
                           &JsiSkPathBuilder::reset);
    installChainableMethod(runtime, prototype, "offset",
                           &JsiSkPathBuilder::offset);
    installChainableMethod(runtime, prototype, "transform",
                           &JsiSkPathBuilder::transform);
    // Query
    installMethod(runtime, prototype, "computeBounds",
                  &JsiSkPathBuilder::computeBounds);
    installMethod(runtime, prototype, "isEmpty", &JsiSkPathBuilder::isEmpty);
    installMethod(runtime, prototype, "getLastPt",
                  &JsiSkPathBuilder::getLastPt);
    installMethod(runtime, prototype, "countPoints",
                  &JsiSkPathBuilder::countPoints);
    // Build
    installMethod(runtime, prototype, "build", &JsiSkPathBuilder::build);
    installMethod(runtime, prototype, "detach", &JsiSkPathBuilder::detach);
  }

  JsiSkPathBuilder(std::shared_ptr<RNSkPlatformContext> context,
                   SkPathBuilder builder)
      : JsiSkWrappingSharedPtrNativeObject<JsiSkPathBuilder, SkPathBuilder>(
            std::move(context),
            std::make_shared<SkPathBuilder>(std::move(builder))) {}

  size_t getMemoryPressure() override {
    auto builder = getObject();
    if (!builder)
      return 0;
    // Estimate memory usage based on snapshot
    return builder->snapshot().approximateBytesUsed();
  }

  static jsi::Value toValue(jsi::Runtime &runtime,
                            std::shared_ptr<RNSkPlatformContext> context,
                            const SkPathBuilder &builder) {
    return makeJsiObject(runtime,
                         std::make_shared<JsiSkPathBuilder>(context, builder));
  }

private:
  static SkPathDirection toDirection(const JsiOptional<bool> &isCCW) {
    return isCCW.has_value() && *isCCW ? SkPathDirection::kCCW
                                       : SkPathDirection::kCW;
  }
};

} // namespace RNSkia
