#pragma once

#include <optional>
#include <string>
#include <utility>
#include <variant>
#include <vector>

#include <include/effects/Sk1DPathEffect.h>
#include <include/effects/Sk2DPathEffect.h>
#include <include/effects/SkCornerPathEffect.h>
#include <include/effects/SkDashPathEffect.h>
#include <include/effects/SkDiscretePathEffect.h>

#include "Command.h"
#include "Convertor.h"
#include "DrawingCtx.h"

namespace RNSkia {

struct DiscretePathEffectProps {
  float length;
  float deviation;
  uint32_t seed;
};

class DiscretePathEffectCmd : public Command {
private:
  DiscretePathEffectProps props;

public:
  DiscretePathEffectCmd(jsi::Runtime &runtime, const jsi::Object &object,
                        Variables &variables)
      : Command(CommandType::PushPathEffect, "skDiscretePathEffect") {
    convertProperty(runtime, object, "length", props.length, variables);
    convertProperty(runtime, object, "deviation", props.deviation, variables);
    convertProperty(runtime, object, "seed", props.seed, variables);
  }

  void pushPathEffect(DrawingCtx *ctx) {
    auto pe =
        SkDiscretePathEffect::Make(props.length, props.deviation, props.seed);
    ctx->pathEffects.push_back(pe);
  }
};

struct DashPathEffectProps {
  std::vector<float> intervals;
  float phase = 0;
};

class DashPathEffectCmd : public Command {
private:
  DashPathEffectProps props;

public:
  DashPathEffectCmd(jsi::Runtime &runtime, const jsi::Object &object,
                    Variables &variables)
      : Command(CommandType::PushPathEffect, "skDashPathEffect") {
    convertProperty(runtime, object, "intervals", props.intervals, variables);
    convertProperty(runtime, object, "phase", props.phase, variables);
  }

  void pushPathEffect(DrawingCtx *ctx) {
    auto intervals = SkSpan(static_cast<SkScalar *>(props.intervals.data()),
                            props.intervals.size());
    auto pe = SkDashPathEffect::Make(intervals, props.phase);
    ctx->pathEffects.push_back(pe);
  }
};

struct Path1DPathEffectProps {
  SkPath path;
  float advance;
  float phase;
  SkPath1DPathEffect::Style style;
};

class Path1DPathEffectCmd : public Command {
private:
  Path1DPathEffectProps props;

public:
  Path1DPathEffectCmd(jsi::Runtime &runtime, const jsi::Object &object,
                      Variables &variables)
      : Command(CommandType::PushPathEffect, "skPath1DPathEffect") {
    convertProperty(runtime, object, "path", props.path, variables);
    convertProperty(runtime, object, "advance", props.advance, variables);
    convertProperty(runtime, object, "phase", props.phase, variables);
    convertProperty(runtime, object, "style", props.style, variables);
  }

  void pushPathEffect(DrawingCtx *ctx) {
    auto pe = SkPath1DPathEffect::Make(props.path, props.advance, props.phase,
                                       props.style);
    if (pe) {
      ctx->pathEffects.push_back(pe);
    }
  }
};

struct Path2DPathEffectProps {
  SkMatrix matrix;
  SkPath path;
};

class Path2DPathEffectCmd : public Command {
private:
  Path2DPathEffectProps props;

public:
  Path2DPathEffectCmd(jsi::Runtime &runtime, const jsi::Object &object,
                      Variables &variables)
      : Command(CommandType::PushPathEffect, "skPath2DPathEffect") {
    convertProperty(runtime, object, "matrix", props.matrix, variables);
    convertProperty(runtime, object, "path", props.path, variables);
  }

  void pushPathEffect(DrawingCtx *ctx) {
    auto pe = SkPath2DPathEffect::Make(props.matrix, props.path);
    if (pe) {
      ctx->pathEffects.push_back(pe);
    }
  }
};

struct CornerPathEffectProps {
  float r;
};

class CornerPathEffectCmd : public Command {
private:
  CornerPathEffectProps props;

public:
  CornerPathEffectCmd(jsi::Runtime &runtime, const jsi::Object &object,
                      Variables &variables)
      : Command(CommandType::PushPathEffect, "skCornerPathEffect") {
    convertProperty(runtime, object, "r", props.r, variables);
  }

  void pushPathEffect(DrawingCtx *ctx) {
    auto pe = SkCornerPathEffect::Make(props.r);
    if (pe) {
      ctx->pathEffects.push_back(pe);
    }
  }
};

class SumPathEffectCmd : public Command {
public:
  SumPathEffectCmd(jsi::Runtime &runtime, const jsi::Object &object,
                   Variables &variables)
      : Command(CommandType::PushPathEffect, "skSumPathEffect") {}

  void pushPathEffect(DrawingCtx *ctx) {
    // Get all path effects
    auto effects = std::move(ctx->pathEffects);
    ctx->pathEffects.clear(); // Clear the vector since we moved from it

    // Create composer function for path effects
    Composer<SkPathEffect> pathEffectComposer = [](sk_sp<SkPathEffect> outer,
                                                   sk_sp<SkPathEffect> inner) {
      return SkPathEffect::MakeSum(outer, inner);
    };

    // Compose all effects
    auto composedEffect =
        composeEffects<SkPathEffect>(effects, pathEffectComposer);

    // If we got a valid composed effect, push it back
    if (composedEffect) {
      ctx->pathEffects.push_back(std::move(composedEffect));
    }
  }
};

struct Line2DPathEffectProps {
  float width;
  SkMatrix matrix;
};

class Line2DPathEffectCmd : public Command {
private:
  Line2DPathEffectProps props;

public:
  Line2DPathEffectCmd(jsi::Runtime &runtime, const jsi::Object &object,
                      Variables &variables)
      : Command(CommandType::PushPathEffect, "skLine2DPathEffect") {
    convertProperty(runtime, object, "width", props.width, variables);
    convertProperty(runtime, object, "matrix", props.matrix, variables);
  }

  void pushPathEffect(DrawingCtx *ctx) {
    auto pe = SkLine2DPathEffect::Make(props.width, props.matrix);
    if (pe) {
      ctx->pathEffects.push_back(pe);
    }
  }
};

} // namespace RNSkia
