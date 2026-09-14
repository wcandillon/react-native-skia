#pragma once

#include <algorithm>
#include <memory>
#include <optional>
#include <set>
#include <string>
#include <utility>
#include <variant>
#include <vector>

#include <jsi/jsi.h>

#include "JsiSkConverters.h"
#include "JsiSkMatrix.h"
#include "JsiSkNativeObjects.h"
#include "JsiSkPoint.h"
#include "JsiSkRRect.h"
#include "JsiSkRect.h"
#include "utils/RNSkLog.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkPath.h"
#include "include/core/SkPathBuilder.h"
#include "include/core/SkPathEffect.h"
#include "include/core/SkPathTypes.h"
#include "include/core/SkPathUtils.h"
#include "include/core/SkString.h"
#include "include/core/SkStrokeRec.h"
#include "include/effects/SkDashPathEffect.h"
#include "include/effects/SkTrimPathEffect.h"
#include "include/utils/SkParsePath.h"

#include "include/pathops/SkPathOps.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

// Track which deprecation warnings have been shown to avoid spam
inline std::set<std::string> &getShownPathDeprecationWarnings() {
  static std::set<std::string> warnings;
  return warnings;
}

inline void warnDeprecatedPathMethod(jsi::Runtime &runtime,
                                     const char *methodName,
                                     const char *suggestion) {
  auto &warnings = getShownPathDeprecationWarnings();
  if (warnings.find(methodName) != warnings.end()) {
    return;
  }
  warnings.insert(methodName);
  std::string message =
      std::string("[react-native-skia] SkPath.") + methodName +
      "() is deprecated and will be removed in a future release. " +
      suggestion +
      " See migration guide: "
      "https://shopify.github.io/react-native-skia/docs/shapes/path-migration";
  RNSkLogger::warnToJavascriptConsole(runtime, message);
}

class JsiSkPath
    : public JsiSkWrappingSharedPtrNativeObject<JsiSkPath, SkPathBuilder> {
public:
  static constexpr const char *CLASS_NAME = "Path";

private:
  static const int MOVE = 0;
  static const int LINE = 1;
  static const int QUAD = 2;
  static const int CONIC = 3;
  static const int CUBIC = 4;
  static const int CLOSE = 5;

  SkPath asPath() const { return getObject()->snapshot(); }

public:
  // Mutable building methods (deprecated) — chainable, and they take the
  // runtime for the JS console deprecation warning.

  void moveTo(jsi::Runtime &runtime, double x, double y) {
    warnDeprecatedPathMethod(runtime, "moveTo",
                             "Use Skia.PathBuilder.Make().moveTo() instead.");
    getObject()->moveTo(x, y);
  }

  void rMoveTo(jsi::Runtime &runtime, double x, double y) {
    warnDeprecatedPathMethod(runtime, "rMoveTo",
                             "Use Skia.PathBuilder.Make().rMoveTo() instead.");
    getObject()->rMoveTo({static_cast<SkScalar>(x), static_cast<SkScalar>(y)});
  }

  void lineTo(jsi::Runtime &runtime, double x, double y) {
    warnDeprecatedPathMethod(runtime, "lineTo",
                             "Use Skia.PathBuilder.Make().lineTo() instead.");
    getObject()->lineTo(x, y);
  }

  void rLineTo(jsi::Runtime &runtime, double x, double y) {
    warnDeprecatedPathMethod(runtime, "rLineTo",
                             "Use Skia.PathBuilder.Make().rLineTo() instead.");
    getObject()->rLineTo(x, y);
  }

  void quadTo(jsi::Runtime &runtime, double x1, double y1, double x2,
              double y2) {
    warnDeprecatedPathMethod(runtime, "quadTo",
                             "Use Skia.PathBuilder.Make().quadTo() instead.");
    getObject()->quadTo(x1, y1, x2, y2);
  }

  void rQuadTo(jsi::Runtime &runtime, double x1, double y1, double x2,
               double y2) {
    warnDeprecatedPathMethod(runtime, "rQuadTo",
                             "Use Skia.PathBuilder.Make().rQuadTo() instead.");
    getObject()->rQuadTo(x1, y1, x2, y2);
  }

  void conicTo(jsi::Runtime &runtime, double x1, double y1, double x2,
               double y2, double w) {
    warnDeprecatedPathMethod(runtime, "conicTo",
                             "Use Skia.PathBuilder.Make().conicTo() instead.");
    getObject()->conicTo(x1, y1, x2, y2, w);
  }

  void rConicTo(jsi::Runtime &runtime, double x1, double y1, double x2,
                double y2, double w) {
    warnDeprecatedPathMethod(runtime, "rConicTo",
                             "Use Skia.PathBuilder.Make().rConicTo() instead.");
    getObject()->rConicTo(x1, y1, x2, y2, w);
  }

  void cubicTo(jsi::Runtime &runtime, double x1, double y1, double x2,
               double y2, double x3, double y3) {
    warnDeprecatedPathMethod(runtime, "cubicTo",
                             "Use Skia.PathBuilder.Make().cubicTo() instead.");
    getObject()->cubicTo(x1, y1, x2, y2, x3, y3);
  }

  void rCubicTo(jsi::Runtime &runtime, double x1, double y1, double x2,
                double y2, double x3, double y3) {
    warnDeprecatedPathMethod(runtime, "rCubicTo",
                             "Use Skia.PathBuilder.Make().rCubicTo() instead.");
    getObject()->rCubicTo(x1, y1, x2, y2, x3, y3);
  }

  void close(jsi::Runtime &runtime) {
    warnDeprecatedPathMethod(runtime, "close",
                             "Use Skia.PathBuilder.Make().close() instead.");
    getObject()->close();
  }

  void reset(jsi::Runtime &runtime) {
    warnDeprecatedPathMethod(runtime, "reset",
                             "Use Skia.PathBuilder.Make().reset() instead.");
    getObject()->reset();
  }

  void rewind(jsi::Runtime &runtime) {
    warnDeprecatedPathMethod(runtime, "rewind",
                             "Use Skia.PathBuilder.Make().reset() instead.");
    getObject()->reset();
  }

  void addPath(jsi::Runtime &runtime, std::shared_ptr<SkPathBuilder> src,
               JsiOptional<std::shared_ptr<SkMatrix>> matrix,
               JsiOptional<bool> extend) {
    warnDeprecatedPathMethod(runtime, "addPath",
                             "Use Skia.PathBuilder.Make().addPath() instead.");
    auto srcPath = src->snapshot();
    auto mode = extend.has_value() && *extend ? SkPath::kExtend_AddPathMode
                                              : SkPath::kAppend_AddPathMode;
    if (matrix.has_value()) {
      getObject()->addPath(srcPath, **matrix, mode);
    } else {
      getObject()->addPath(srcPath, mode);
    }
  }

  void addArc(jsi::Runtime &runtime, std::shared_ptr<SkRect> rect,
              double start, double sweep) {
    warnDeprecatedPathMethod(runtime, "addArc",
                             "Use Skia.PathBuilder.Make().addArc() instead.");
    getObject()->addArc(*rect, start, sweep);
  }

  void addOval(jsi::Runtime &runtime, std::shared_ptr<SkRect> rect,
               JsiOptional<bool> isCCW, JsiOptional<double> startIndex) {
    warnDeprecatedPathMethod(
        runtime, "addOval",
        "Use Skia.Path.Oval() or Skia.PathBuilder.Make().addOval() instead.");
    getObject()->addOval(*rect, toDirection(isCCW),
                         startIndex.has_value()
                             ? static_cast<unsigned>(*startIndex)
                             : 1);
  }

  void addRect(jsi::Runtime &runtime, std::shared_ptr<SkRect> rect,
               JsiOptional<bool> isCCW) {
    warnDeprecatedPathMethod(
        runtime, "addRect",
        "Use Skia.Path.Rect() or Skia.PathBuilder.Make().addRect() instead.");
    getObject()->addRect(*rect, toDirection(isCCW));
  }

  void addRRect(jsi::Runtime &runtime, std::shared_ptr<SkRRect> rrect,
                JsiOptional<bool> isCCW) {
    warnDeprecatedPathMethod(
        runtime, "addRRect",
        "Use Skia.Path.RRect() or Skia.PathBuilder.Make().addRRect() instead.");
    getObject()->addRRect(*rrect, toDirection(isCCW));
  }

  void addCircle(jsi::Runtime &runtime, double x, double y, double r) {
    warnDeprecatedPathMethod(
        runtime, "addCircle",
        "Use Skia.Path.Circle() or Skia.PathBuilder.Make().addCircle() "
        "instead.");
    getObject()->addCircle(x, y, r);
  }

  void addPoly(jsi::Runtime &runtime, std::vector<SkPoint> points,
               bool close) {
    warnDeprecatedPathMethod(
        runtime, "addPoly",
        "Use Skia.Path.Polygon() or Skia.PathBuilder.Make().addPoly() "
        "instead.");
    getObject()->addPolygon(SkSpan<const SkPoint>(points.data(), points.size()),
                            close);
  }

  void arcToOval(jsi::Runtime &runtime, std::shared_ptr<SkRect> rect,
                 double start, double sweep, bool forceMoveTo) {
    warnDeprecatedPathMethod(
        runtime, "arcToOval",
        "Use Skia.PathBuilder.Make().arcToOval() instead.");
    getObject()->arcTo(*rect, start, sweep, forceMoveTo);
  }

  void arcToRotated(jsi::Runtime &runtime, double rx, double ry,
                    double xAxisRotate, bool useSmallArc, bool isCCW, double x,
                    double y) {
    warnDeprecatedPathMethod(
        runtime, "arcToRotated",
        "Use Skia.PathBuilder.Make().arcToRotated() instead.");
    auto arcSize = useSmallArc ? SkPathBuilder::kSmall_ArcSize
                               : SkPathBuilder::kLarge_ArcSize;
    auto sweep = isCCW ? SkPathDirection::kCCW : SkPathDirection::kCW;
    getObject()->arcTo(SkPoint::Make(rx, ry), xAxisRotate, arcSize, sweep,
                       SkPoint::Make(x, y));
  }

  void rArcTo(jsi::Runtime &runtime, double rx, double ry, double xAxisRotate,
              bool useSmallArc, bool isCCW, double dx, double dy) {
    warnDeprecatedPathMethod(runtime, "rArcTo",
                             "Use Skia.PathBuilder.Make().rArcTo() instead.");
    auto arcSize = useSmallArc ? SkPathBuilder::kSmall_ArcSize
                               : SkPathBuilder::kLarge_ArcSize;
    auto sweep = isCCW ? SkPathDirection::kCCW : SkPathDirection::kCW;
    SkVector dxdy(dx, dy);
    SkPoint r(rx, ry);
    getObject()->rArcTo(r, xAxisRotate, arcSize, sweep, dxdy);
  }

  void arcToTangent(jsi::Runtime &runtime, double x1, double y1, double x2,
                    double y2, double r) {
    warnDeprecatedPathMethod(
        runtime, "arcToTangent",
        "Use Skia.PathBuilder.Make().arcToTangent() instead.");
    getObject()->arcTo(SkPoint::Make(x1, y1), SkPoint::Make(x2, y2), r);
  }

  void setFillType(jsi::Runtime &runtime, double ft) {
    warnDeprecatedPathMethod(
        runtime, "setFillType",
        "Use Skia.PathBuilder.Make().setFillType() instead.");
    getObject()->setFillType(static_cast<SkPathFillType>(static_cast<int>(ft)));
  }

  void setIsVolatile(jsi::Runtime &runtime, bool v) {
    warnDeprecatedPathMethod(
        runtime, "setIsVolatile",
        "Use Skia.PathBuilder.Make().setIsVolatile() instead.");
    getObject()->setIsVolatile(v);
  }

  // Mutable transform methods (deprecated)

  void transform(jsi::Runtime &runtime, std::shared_ptr<SkMatrix> m3) {
    warnDeprecatedPathMethod(
        runtime, "transform",
        "Use Skia.PathBuilder.Make().transform() instead.");
    getObject()->transform(*m3);
  }

  void offset(jsi::Runtime &runtime, double dx, double dy) {
    warnDeprecatedPathMethod(runtime, "offset",
                             "Use Skia.PathBuilder.Make().offset() instead.");
    getObject()->offset(dx, dy);
  }

  // Mutable path operations (deprecated)

  void simplify(jsi::Runtime &runtime) {
    warnDeprecatedPathMethod(runtime, "simplify",
                             "Use Skia.Path.Simplify(path) instead.");
    auto path = asPath();
    auto result = ::Simplify(path);
    if (result.has_value()) {
      *getObject() = SkPathBuilder(result.value());
    }
  }

  void op(jsi::Runtime &runtime, std::shared_ptr<SkPathBuilder> path2,
          double pathOp) {
    warnDeprecatedPathMethod(runtime, "op",
                             "Use Skia.Path.MakeFromOp() instead.");
    auto p1 = asPath();
    auto p2 = path2->snapshot();
    auto result =
        ::Op(p1, p2, static_cast<SkPathOp>(static_cast<int>(pathOp)));
    if (result.has_value()) {
      *getObject() = SkPathBuilder(result.value());
    }
  }

  void makeAsWinding(jsi::Runtime &runtime) {
    warnDeprecatedPathMethod(runtime, "makeAsWinding",
                             "Use Skia.Path.AsWinding(path) instead.");
    auto path = asPath();
    auto result = ::AsWinding(path);
    if (result.has_value()) {
      *getObject() = SkPathBuilder(result.value());
    }
  }

  void dash(jsi::Runtime &runtime, double on, double off, double phase) {
    warnDeprecatedPathMethod(
        runtime, "dash", "Use Skia.Path.Dash(path, on, off, phase) instead.");
    auto path = asPath();
    SkScalar intervals[] = {static_cast<SkScalar>(on),
                            static_cast<SkScalar>(off)};
    auto pe = SkDashPathEffect::Make(SkSpan(intervals, 2), phase);
    if (pe) {
      SkStrokeRec rec(SkStrokeRec::InitStyle::kHairline_InitStyle);
      SkPathBuilder resultBuilder;
      if (pe->filterPath(&resultBuilder, path, &rec)) {
        *getObject() = std::move(resultBuilder);
      }
    }
  }

  // Stays raw: the options object is read leniently property by property.
  JSI_HOST_FUNCTION(stroke) {
    warnDeprecatedPathMethod(runtime, "stroke",
                             "Use Skia.Path.Stroke(path, opts) instead.");
    auto path = asPath();
    SkPaint p;
    p.setStyle(SkPaint::kStroke_Style);

    if (count > 0 && !arguments[0].isUndefined()) {
      auto opts = arguments[0].asObject(runtime);

      auto jsiCap = opts.getProperty(runtime, "cap");
      if (!jsiCap.isUndefined()) {
        p.setStrokeCap(
            static_cast<SkPaint::Cap>(static_cast<int>(jsiCap.asNumber())));
      }

      auto jsiJoin = opts.getProperty(runtime, "join");
      if (!jsiJoin.isUndefined()) {
        p.setStrokeJoin(
            static_cast<SkPaint::Join>(static_cast<int>(jsiJoin.asNumber())));
      }

      auto jsiWidth = opts.getProperty(runtime, "width");
      if (!jsiWidth.isUndefined()) {
        p.setStrokeWidth(jsiWidth.asNumber());
      }

      auto jsiMiterLimit = opts.getProperty(runtime, "miter_limit");
      if (!jsiMiterLimit.isUndefined()) {
        p.setStrokeMiter(jsiMiterLimit.asNumber());
      }
    }

    SkPathBuilder resultBuilder;
    auto success = skpathutils::FillPathWithPaint(path, p, &resultBuilder);
    if (success) {
      *getObject() = std::move(resultBuilder);
    }
    return thisValue.getObject(runtime);
  }

  void trim(jsi::Runtime &runtime, double startValue, double endValue,
            bool isComplement) {
    warnDeprecatedPathMethod(
        runtime, "trim",
        "Use Skia.Path.Trim(path, start, end, isComplement) instead.");
    auto path = asPath();
    float start = std::clamp(static_cast<float>(startValue), 0.0f, 1.0f);
    float end = std::clamp(static_cast<float>(endValue), 0.0f, 1.0f);
    auto mode = isComplement ? SkTrimPathEffect::Mode::kInverted
                             : SkTrimPathEffect::Mode::kNormal;
    auto pe = SkTrimPathEffect::Make(start, end, mode);
    if (pe) {
      SkStrokeRec rec(SkStrokeRec::InitStyle::kHairline_InitStyle);
      SkPathBuilder resultBuilder;
      if (pe->filterPath(&resultBuilder, path, &rec)) {
        *getObject() = std::move(resultBuilder);
      }
    }
  }

  // Query methods

  std::shared_ptr<JsiSkRect> computeTightBounds() {
    auto path = asPath();
    return std::make_shared<JsiSkRect>(getContext(),
                                       path.computeTightBounds());
  }

  std::shared_ptr<JsiSkRect> getBounds() {
    return std::make_shared<JsiSkRect>(getContext(),
                                       getObject()->computeBounds());
  }

  bool contains(double x, double y) { return asPath().contains(x, y); }

  int getFillType() { return static_cast<int>(getObject()->fillType()); }

  bool isVolatile() { return asPath().isVolatile(); }

  std::shared_ptr<JsiSkPoint> getPoint(int index) {
    auto point = asPath().getPoint(index);
    return std::make_shared<JsiSkPoint>(getContext(), point);
  }

  bool isEmpty() { return getObject()->isEmpty(); }

  int countPoints() { return asPath().countPoints(); }

  SkPoint getLastPt() {
    auto last = getObject()->getLastPt();
    return last.value_or(SkPoint::Make(0, 0));
  }

  std::string toSVGString() {
    auto path = asPath();
    auto s = SkParsePath::ToSVGString(path);
    return std::string(s.c_str());
  }

  bool equals(std::shared_ptr<SkPathBuilder> p1,
              std::shared_ptr<SkPathBuilder> p2) {
    return p1->snapshot() == p2->snapshot();
  }

  std::shared_ptr<JsiSkPath> copy() {
    return std::make_shared<JsiSkPath>(getContext(), asPath());
  }

  bool isInterpolatable(std::shared_ptr<SkPathBuilder> path2) {
    auto p1 = asPath();
    auto p2 = path2->snapshot();
    return p1.isInterpolatable(p2);
  }

  std::variant<std::nullptr_t, std::shared_ptr<JsiSkPath>>
  interpolate(std::shared_ptr<SkPathBuilder> path2, double weight) {
    auto p1 = asPath();
    auto p2 = path2->snapshot();
    SkPath result;
    auto succeed = p1.interpolate(p2, weight, &result);
    if (!succeed) {
      return nullptr;
    }
    return std::make_shared<JsiSkPath>(getContext(), std::move(result));
  }

  std::vector<std::vector<double>> toCmds() {
    auto path = asPath();
    std::vector<std::vector<double>> cmds;
    SkPoint pts[4];
    SkPath::Iter iter(path, false);
    SkPath::Verb verb;

    while ((verb = iter.next(pts)) != SkPath::kDone_Verb) {
      switch (verb) {
      case SkPath::kMove_Verb: {
        cmds.push_back({static_cast<double>(MOVE),
                        static_cast<double>(pts[0].x()),
                        static_cast<double>(pts[0].y())});
        break;
      }
      case SkPath::kLine_Verb: {
        cmds.push_back({static_cast<double>(LINE),
                        static_cast<double>(pts[1].x()),
                        static_cast<double>(pts[1].y())});
        break;
      }
      case SkPath::kQuad_Verb: {
        cmds.push_back(
            {static_cast<double>(QUAD), static_cast<double>(pts[1].x()),
             static_cast<double>(pts[1].y()), static_cast<double>(pts[2].x()),
             static_cast<double>(pts[2].y())});
        break;
      }
      case SkPath::kConic_Verb: {
        cmds.push_back(
            {static_cast<double>(CONIC), static_cast<double>(pts[1].x()),
             static_cast<double>(pts[1].y()), static_cast<double>(pts[2].x()),
             static_cast<double>(pts[2].y()),
             static_cast<double>(iter.conicWeight())});
        break;
      }
      case SkPath::kCubic_Verb: {
        cmds.push_back(
            {static_cast<double>(CUBIC), static_cast<double>(pts[1].x()),
             static_cast<double>(pts[1].y()), static_cast<double>(pts[2].x()),
             static_cast<double>(pts[2].y()), static_cast<double>(pts[3].x()),
             static_cast<double>(pts[3].y())});
        break;
      }
      case SkPath::kClose_Verb: {
        cmds.push_back({static_cast<double>(CLOSE)});
        break;
      }
      default:
        break;
      }
    }
    return cmds;
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    // Mutable building methods
    installChainableMethodWithRuntime(runtime, prototype, "moveTo",
                                      &JsiSkPath::moveTo);
    installChainableMethodWithRuntime(runtime, prototype, "rMoveTo",
                                      &JsiSkPath::rMoveTo);
    installChainableMethodWithRuntime(runtime, prototype, "lineTo",
                                      &JsiSkPath::lineTo);
    installChainableMethodWithRuntime(runtime, prototype, "rLineTo",
                                      &JsiSkPath::rLineTo);
    installChainableMethodWithRuntime(runtime, prototype, "quadTo",
                                      &JsiSkPath::quadTo);
    installChainableMethodWithRuntime(runtime, prototype, "rQuadTo",
                                      &JsiSkPath::rQuadTo);
    installChainableMethodWithRuntime(runtime, prototype, "conicTo",
                                      &JsiSkPath::conicTo);
    installChainableMethodWithRuntime(runtime, prototype, "rConicTo",
                                      &JsiSkPath::rConicTo);
    installChainableMethodWithRuntime(runtime, prototype, "cubicTo",
                                      &JsiSkPath::cubicTo);
    installChainableMethodWithRuntime(runtime, prototype, "rCubicTo",
                                      &JsiSkPath::rCubicTo);
    installChainableMethodWithRuntime(runtime, prototype, "close",
                                      &JsiSkPath::close);
    installChainableMethodWithRuntime(runtime, prototype, "reset",
                                      &JsiSkPath::reset);
    installChainableMethodWithRuntime(runtime, prototype, "rewind",
                                      &JsiSkPath::rewind);
    installChainableMethodWithRuntime(runtime, prototype, "addPath",
                                      &JsiSkPath::addPath);
    installChainableMethodWithRuntime(runtime, prototype, "addArc",
                                      &JsiSkPath::addArc);
    installChainableMethodWithRuntime(runtime, prototype, "addOval",
                                      &JsiSkPath::addOval);
    installChainableMethodWithRuntime(runtime, prototype, "addRect",
                                      &JsiSkPath::addRect);
    installChainableMethodWithRuntime(runtime, prototype, "addRRect",
                                      &JsiSkPath::addRRect);
    installChainableMethodWithRuntime(runtime, prototype, "addCircle",
                                      &JsiSkPath::addCircle);
    installChainableMethodWithRuntime(runtime, prototype, "addPoly",
                                      &JsiSkPath::addPoly);
    installChainableMethodWithRuntime(runtime, prototype, "arcToOval",
                                      &JsiSkPath::arcToOval);
    installChainableMethodWithRuntime(runtime, prototype, "arcToRotated",
                                      &JsiSkPath::arcToRotated);
    installChainableMethodWithRuntime(runtime, prototype, "rArcTo",
                                      &JsiSkPath::rArcTo);
    installChainableMethodWithRuntime(runtime, prototype, "arcToTangent",
                                      &JsiSkPath::arcToTangent);
    installChainableMethodWithRuntime(runtime, prototype, "setFillType",
                                      &JsiSkPath::setFillType);
    installChainableMethodWithRuntime(runtime, prototype, "setIsVolatile",
                                      &JsiSkPath::setIsVolatile);
    // Mutable transform methods
    installChainableMethodWithRuntime(runtime, prototype, "transform",
                                      &JsiSkPath::transform);
    installChainableMethodWithRuntime(runtime, prototype, "offset",
                                      &JsiSkPath::offset);
    // Mutable path operations
    installChainableMethodWithRuntime(runtime, prototype, "simplify",
                                      &JsiSkPath::simplify);
    installChainableMethodWithRuntime(runtime, prototype, "op",
                                      &JsiSkPath::op);
    installChainableMethodWithRuntime(runtime, prototype, "makeAsWinding",
                                      &JsiSkPath::makeAsWinding);
    installChainableMethodWithRuntime(runtime, prototype, "dash",
                                      &JsiSkPath::dash);
    installHostMethod(runtime, prototype, "stroke", &JsiSkPath::stroke);
    installChainableMethodWithRuntime(runtime, prototype, "trim",
                                      &JsiSkPath::trim);
    // Query methods
    installMethod(runtime, prototype, "computeTightBounds",
                  &JsiSkPath::computeTightBounds);
    installMethod(runtime, prototype, "getBounds", &JsiSkPath::getBounds);
    installMethod(runtime, prototype, "contains", &JsiSkPath::contains);
    installMethod(runtime, prototype, "getFillType", &JsiSkPath::getFillType);
    installMethod(runtime, prototype, "isVolatile", &JsiSkPath::isVolatile);
    installMethod(runtime, prototype, "getPoint", &JsiSkPath::getPoint);
    installMethod(runtime, prototype, "isEmpty", &JsiSkPath::isEmpty);
    installMethod(runtime, prototype, "countPoints", &JsiSkPath::countPoints);
    installMethod(runtime, prototype, "getLastPt", &JsiSkPath::getLastPt);
    installMethod(runtime, prototype, "toSVGString", &JsiSkPath::toSVGString);
    installMethod(runtime, prototype, "equals", &JsiSkPath::equals);
    installMethod(runtime, prototype, "copy", &JsiSkPath::copy);
    installMethod(runtime, prototype, "isInterpolatable",
                  &JsiSkPath::isInterpolatable);
    installMethod(runtime, prototype, "interpolate", &JsiSkPath::interpolate);
    installMethod(runtime, prototype, "toCmds", &JsiSkPath::toCmds);
  }

  JsiSkPath(std::shared_ptr<RNSkPlatformContext> context, SkPathBuilder builder)
      : JsiSkWrappingSharedPtrNativeObject<JsiSkPath, SkPathBuilder>(
            std::move(context),
            std::make_shared<SkPathBuilder>(std::move(builder))) {}

  // Convenience: construct from SkPath
  JsiSkPath(std::shared_ptr<RNSkPlatformContext> context, const SkPath &path)
      : JsiSkPath(std::move(context), SkPathBuilder(path)) {}

  size_t getMemoryPressure() override {
    auto builder = getObject();
    if (!builder)
      return 0;

    return builder->snapshot().approximateBytesUsed();
  }

  /**
    Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<SkPathBuilder> fromValue(jsi::Runtime &runtime,
                                                  const jsi::Value &obj) {
    return objectFromValue(runtime, obj);
  }

  static SkPath pathFromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    return fromValue(runtime, obj)->snapshot();
  }

  static jsi::Value toValue(jsi::Runtime &runtime,
                            std::shared_ptr<RNSkPlatformContext> context,
                            const SkPath &path) {
    return makeJsiObject(runtime, std::make_shared<JsiSkPath>(context, path));
  }

  static jsi::Value toValue(jsi::Runtime &runtime,
                            std::shared_ptr<RNSkPlatformContext> context,
                            SkPath &&path) {
    return makeJsiObject(runtime,
                         std::make_shared<JsiSkPath>(context, std::move(path)));
  }

private:
  static SkPathDirection toDirection(const JsiOptional<bool> &isCCW) {
    return isCCW.has_value() && *isCCW ? SkPathDirection::kCCW
                                       : SkPathDirection::kCW;
  }
};

} // namespace RNSkia
