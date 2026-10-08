#pragma once

#include <algorithm>
#include <memory>
#include <optional>
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
    if (isDisposed()) {
      return 0;
    }
    auto builder = getObjectUnchecked();
    if (!builder) {
      return 0;
    }
    // The point, verb and conic weight arrays of the builder. Snapshotting
    // the path to measure it would copy them, and this runs on every round
    // trip of the object to JS.
    return builder->points().size_bytes() + builder->verbs().size_bytes() +
           builder->conicWeights().size_bytes();
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
