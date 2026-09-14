#pragma once

#include <algorithm>
#include <memory>
#include <string>
#include <utility>
#include <variant>
#include <vector>

#include <jsi/jsi.h>

#include "JsiSkConverters.h"
#include "JsiSkFont.h"
#include "JsiSkMatrix.h"
#include "JsiSkNativeObjects.h"
#include "JsiSkPath.h"
#include "JsiSkPathEffect.h"
#include "JsiSkPoint.h"
#include "JsiSkRRect.h"
#include "JsiSkRect.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkPath.h"
#include "include/core/SkPathBuilder.h"
#include "include/core/SkPathUtils.h"
#include "include/core/SkStrokeRec.h"
#include "include/effects/SkDashPathEffect.h"
#include "include/effects/SkTrimPathEffect.h"
#include "include/pathops/SkPathOps.h"
#include "include/utils/SkTextUtils.h"
#include "utils/RNSkLog.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkPathFactory : public JsiSkNativeObject<JsiSkPathFactory> {

  static const int MOVE = 0;
  static const int LINE = 1;
  static const int QUAD = 2;
  static const int CONIC = 3;
  static const int CUBIC = 4;
  static const int CLOSE = 5;

  using NullablePath = std::variant<std::nullptr_t, std::shared_ptr<JsiSkPath>>;

public:
  static constexpr const char *CLASS_NAME = "PathFactory";

  std::shared_ptr<JsiSkPath> Make() {
    return std::make_shared<JsiSkPath>(getContext(), SkPath());
  }

  std::shared_ptr<JsiSkPath> MakeFromSVGString(std::string svgString) {
    auto result = SkParsePath::FromSVGString(svgString.c_str());
    if (!result.has_value()) {
      throw std::runtime_error("Could not parse Svg path");
    }
    return std::make_shared<JsiSkPath>(getContext(),
                                       std::move(result.value()));
  }

  NullablePath MakeFromOp(std::shared_ptr<SkPathBuilder> pathOne,
                          std::shared_ptr<SkPathBuilder> pathTwo, double op) {
    auto one = pathOne->snapshot();
    auto two = pathTwo->snapshot();
    auto result = Op(one, two, static_cast<SkPathOp>(op));
    if (!result.has_value()) {
      return nullptr;
    }
    return std::make_shared<JsiSkPath>(getContext(),
                                       std::move(result.value()));
  }

  NullablePath MakeFromCmds(std::vector<std::vector<double>> cmds) {
    SkPathBuilder builder;
    for (const auto &cmd : cmds) {
      if (cmd.size() < 1) {
        RNSkLogger::logToConsole("Invalid command found (got an empty array)");
        return nullptr;
      }
      auto verb = static_cast<int>(cmd[0]);
      switch (verb) {
      case MOVE: {
        if (cmd.size() < 3) {
          RNSkLogger::logToConsole("Invalid move command found");
          return nullptr;
        }
        builder.moveTo(cmd[1], cmd[2]);
        break;
      }
      case LINE: {
        if (cmd.size() < 3) {
          RNSkLogger::logToConsole("Invalid line command found");
          return nullptr;
        }
        builder.lineTo(cmd[1], cmd[2]);
        break;
      }
      case QUAD: {
        if (cmd.size() < 5) {
          RNSkLogger::logToConsole("Invalid line command found");
          return nullptr;
        }
        builder.quadTo(cmd[1], cmd[2], cmd[3], cmd[4]);
        break;
      }
      case CONIC: {
        if (cmd.size() < 6) {
          RNSkLogger::logToConsole("Invalid line command found");
          return nullptr;
        }
        builder.conicTo(cmd[1], cmd[2], cmd[3], cmd[4], cmd[5]);
        break;
      }
      case CUBIC: {
        if (cmd.size() < 7) {
          RNSkLogger::logToConsole("Invalid line command found");
          return nullptr;
        }
        builder.cubicTo(cmd[1], cmd[2], cmd[3], cmd[4], cmd[5], cmd[6]);
        break;
      }
      case CLOSE: {
        builder.close();
        break;
      }
      default: {
        RNSkLogger::logToConsole("Found an unknown command");
        return nullptr;
      }
      }
    }
    return std::make_shared<JsiSkPath>(getContext(), builder.snapshot());
  }

  std::shared_ptr<JsiSkPath> MakeFromText(std::string text, double x, double y,
                                          std::shared_ptr<SkFont> font) {
    SkPath path;
    SkTextUtils::GetPath(text.c_str(), strlen(text.c_str()),
                         SkTextEncoding::kUTF8, x, y, *font, &path);
    return std::make_shared<JsiSkPath>(getContext(), std::move(path));
  }

  // Static shape factories
  std::shared_ptr<JsiSkPath> Rect(SkRect rect, JsiOptional<bool> isCCW) {
    SkPathBuilder builder;
    builder.addRect(rect, toDirection(isCCW));
    return std::make_shared<JsiSkPath>(getContext(), builder.snapshot());
  }

  std::shared_ptr<JsiSkPath> Oval(SkRect rect, JsiOptional<bool> isCCW,
                                  JsiOptional<double> startIndex) {
    SkPathBuilder builder;
    builder.addOval(rect, toDirection(isCCW),
                    startIndex.has_value()
                        ? static_cast<unsigned>(*startIndex)
                        : 0);
    return std::make_shared<JsiSkPath>(getContext(), builder.snapshot());
  }

  std::shared_ptr<JsiSkPath> Circle(double x, double y, double r) {
    SkPathBuilder builder;
    builder.addCircle(x, y, r);
    return std::make_shared<JsiSkPath>(getContext(), builder.snapshot());
  }

  std::shared_ptr<JsiSkPath> RRect(std::shared_ptr<SkRRect> rrect,
                                   JsiOptional<bool> isCCW) {
    SkPathBuilder builder;
    builder.addRRect(*rrect, toDirection(isCCW));
    return std::make_shared<JsiSkPath>(getContext(), builder.snapshot());
  }

  std::shared_ptr<JsiSkPath> Line(SkPoint p1, SkPoint p2) {
    SkPathBuilder builder;
    builder.moveTo(p1);
    builder.lineTo(p2);
    return std::make_shared<JsiSkPath>(getContext(), builder.snapshot());
  }

  std::shared_ptr<JsiSkPath> Polygon(std::vector<SkPoint> points, bool close) {
    SkPathBuilder builder;
    builder.addPolygon(SkSpan(points), close);
    return std::make_shared<JsiSkPath>(getContext(), builder.snapshot());
  }

  // Static path operations

  // Stays raw: the options object is read leniently property by property
  // (unknown properties and non-numeric values are ignored).
  JSI_HOST_FUNCTION(Stroke) {
    auto srcPath = JsiSkPath::fromValue(runtime, arguments[0]);
    SkPath path = srcPath->snapshot();
    SkPaint p;
    p.setStyle(SkPaint::kStroke_Style);

    if (count > 1 && !arguments[1].isUndefined()) {
      auto opts = arguments[1].asObject(runtime);

      auto jsiCap = opts.getProperty(runtime, "cap");
      if (!jsiCap.isUndefined()) {
        auto cap = (SkPaint::Cap)jsiCap.asNumber();
        p.setStrokeCap(cap);
      }

      auto jsiJoin = opts.getProperty(runtime, "join");
      if (!jsiJoin.isUndefined()) {
        auto join = (SkPaint::Join)jsiJoin.asNumber();
        p.setStrokeJoin(join);
      }

      auto jsiWidth = opts.getProperty(runtime, "width");
      if (!jsiWidth.isUndefined()) {
        auto width = jsiWidth.asNumber();
        p.setStrokeWidth(width);
      }

      auto jsiMiterLimit = opts.getProperty(runtime, "miter_limit");
      if (!jsiMiterLimit.isUndefined()) {
        auto miter_limit = jsiMiterLimit.asNumber();
        p.setStrokeMiter(miter_limit);
      }

      auto jsiPrecision = opts.getProperty(runtime, "precision");
      auto precision = jsiPrecision.isUndefined() ? 1 : jsiPrecision.asNumber();
      SkPathBuilder resultBuilder;
      auto ctm = SkMatrix::Scale(precision, precision);
      auto success =
          skpathutils::FillPathWithPaint(path, p, &resultBuilder, nullptr, ctm);
      if (success) {
        return makeJsiObject(
            runtime, std::make_shared<JsiSkPath>(getContext(),
                                                 resultBuilder.snapshot()));
      }
    } else {
      SkPathBuilder resultBuilder;
      auto success = skpathutils::FillPathWithPaint(path, p, &resultBuilder);
      if (success) {
        return makeJsiObject(
            runtime, std::make_shared<JsiSkPath>(getContext(),
                                                 resultBuilder.snapshot()));
      }
    }
    return jsi::Value::null();
  }

  NullablePath Trim(std::shared_ptr<SkPathBuilder> srcPath, double startValue,
                    double endValue, bool isComplement) {
    float start = std::clamp(static_cast<float>(startValue), 0.0f, 1.0f);
    float end = std::clamp(static_cast<float>(endValue), 0.0f, 1.0f);
    // If requesting the full path in normal mode, just return a copy
    if (start <= 0 && end >= 1 && !isComplement) {
      return std::make_shared<JsiSkPath>(getContext(), srcPath->snapshot());
    }
    SkPath path = srcPath->snapshot();
    auto mode = isComplement ? SkTrimPathEffect::Mode::kInverted
                             : SkTrimPathEffect::Mode::kNormal;
    auto pe = SkTrimPathEffect::Make(start, end, mode);
    if (!pe) {
      return nullptr;
    }
    SkStrokeRec rec(SkStrokeRec::InitStyle::kHairline_InitStyle);
    SkPathBuilder resultBuilder;
    if (pe->filterPath(&resultBuilder, path, &rec)) {
      return std::make_shared<JsiSkPath>(getContext(), resultBuilder.detach());
    }
    return nullptr;
  }

  NullablePath Simplify(std::shared_ptr<SkPathBuilder> srcPath) {
    auto result = ::Simplify(srcPath->snapshot());
    if (result.has_value()) {
      return std::make_shared<JsiSkPath>(getContext(),
                                         std::move(result.value()));
    }
    return nullptr;
  }

  NullablePath Dash(std::shared_ptr<SkPathBuilder> srcPath, double on,
                    double off, double phase) {
    SkScalar intervals[] = {static_cast<SkScalar>(on),
                            static_cast<SkScalar>(off)};
    auto i = SkSpan(intervals, 2);
    auto pe = SkDashPathEffect::Make(i, phase);
    if (!pe) {
      return nullptr;
    }
    SkStrokeRec rec(SkStrokeRec::InitStyle::kHairline_InitStyle);
    SkPathBuilder resultBuilder;
    if (pe->filterPath(&resultBuilder, srcPath->snapshot(), &rec)) {
      return std::make_shared<JsiSkPath>(getContext(), resultBuilder.detach());
    }
    return nullptr;
  }

  NullablePath AsWinding(std::shared_ptr<SkPathBuilder> srcPath) {
    auto result = ::AsWinding(srcPath->snapshot());
    if (result.has_value()) {
      return std::make_shared<JsiSkPath>(getContext(),
                                         std::move(result.value()));
    }
    return nullptr;
  }

  NullablePath Interpolate(std::shared_ptr<SkPathBuilder> pathOne,
                           std::shared_ptr<SkPathBuilder> pathTwo,
                           double weight) {
    auto p1 = pathOne->snapshot();
    auto p2 = pathTwo->snapshot();
    SkPath result;
    auto succeed = p1.interpolate(p2, weight, &result);
    if (!succeed) {
      return nullptr;
    }
    return std::make_shared<JsiSkPath>(getContext(), std::move(result));
  }

  size_t getMemoryPressure() override { return 1024; }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installMethod(runtime, prototype, "Make", &JsiSkPathFactory::Make);
    installMethod(runtime, prototype, "MakeFromSVGString",
                  &JsiSkPathFactory::MakeFromSVGString);
    installMethod(runtime, prototype, "MakeFromOp",
                  &JsiSkPathFactory::MakeFromOp);
    installMethod(runtime, prototype, "MakeFromCmds",
                  &JsiSkPathFactory::MakeFromCmds);
    installMethod(runtime, prototype, "MakeFromText",
                  &JsiSkPathFactory::MakeFromText);
    // Static shape factories
    installMethod(runtime, prototype, "Rect", &JsiSkPathFactory::Rect);
    installMethod(runtime, prototype, "Oval", &JsiSkPathFactory::Oval);
    installMethod(runtime, prototype, "Circle", &JsiSkPathFactory::Circle);
    installMethod(runtime, prototype, "RRect", &JsiSkPathFactory::RRect);
    installMethod(runtime, prototype, "Line", &JsiSkPathFactory::Line);
    installMethod(runtime, prototype, "Polygon", &JsiSkPathFactory::Polygon);
    // Static path operations
    installHostMethod(runtime, prototype, "Stroke", &JsiSkPathFactory::Stroke);
    installMethod(runtime, prototype, "Trim", &JsiSkPathFactory::Trim);
    installMethod(runtime, prototype, "Simplify", &JsiSkPathFactory::Simplify);
    installMethod(runtime, prototype, "Dash", &JsiSkPathFactory::Dash);
    installMethod(runtime, prototype, "AsWinding",
                  &JsiSkPathFactory::AsWinding);
    installMethod(runtime, prototype, "Interpolate",
                  &JsiSkPathFactory::Interpolate);
  }

  explicit JsiSkPathFactory(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkNativeObject<JsiSkPathFactory>(std::move(context)) {}

private:
  static SkPathDirection toDirection(const JsiOptional<bool> &isCCW) {
    return isCCW.has_value() && *isCCW ? SkPathDirection::kCCW
                                       : SkPathDirection::kCW;
  }
};

} // namespace RNSkia
