#pragma once

#include <optional>
#include <string>
#include <variant>
#include <vector>

#include <include/core/SkColorFilter.h>
#include <include/effects/SkLumaColorFilter.h>

#include "Command.h"
#include "Convertor.h"
#include "DrawingCtx.h"

namespace RNSkia {

struct MatrixColorFilterProps {
  std::vector<float> matrix;
};

class MatrixColorFilterCmd : public Command {
private:
  MatrixColorFilterProps props;

public:
  MatrixColorFilterCmd(jsi::Runtime &runtime, const jsi::Object &object,
                       Variables &variables)
      : Command(CommandType::PushColorFilter, "skMatrixColorFilter") {
    convertProperty(runtime, object, "matrix", props.matrix, variables);
  }

  void pushColorFilter(DrawingCtx *ctx) {
    if (props.matrix.size() == 20) {
      auto cf = SkColorFilters::Matrix(props.matrix.data());
      ctx->colorFilters.push_back(cf);
    }
  }
};

struct BlendColorFilterProps {
  SkBlendMode mode;
  SkColor color;
};

class BlendColorFilterCmd : public Command {
private:
  BlendColorFilterProps props;

public:
  BlendColorFilterCmd(jsi::Runtime &runtime, const jsi::Object &object,
                      Variables &variables)
      : Command(CommandType::PushColorFilter, "skBlendColorFilter") {
    convertProperty(runtime, object, "mode", props.mode, variables);
    convertProperty(runtime, object, "color", props.color, variables);
  }

  void pushColorFilter(DrawingCtx *ctx) {
    auto cf = SkColorFilters::Blend(props.color, props.mode);
    ctx->colorFilters.push_back(cf);
  }
};

class LinearToSRGBGammaColorFilterCmd : public Command {
public:
  LinearToSRGBGammaColorFilterCmd(jsi::Runtime &runtime,
                                  const jsi::Object &object,
                                  Variables &variables)
      : Command(CommandType::PushColorFilter,
                "skLinearToSRGBGammaColorFilter") {}

  void pushColorFilter(DrawingCtx *ctx) {
    auto cf = SkColorFilters::LinearToSRGBGamma();
    ctx->colorFilters.push_back(cf);
  }
};

class SRGBToLinearGammaColorFilterCmd : public Command {
public:
  SRGBToLinearGammaColorFilterCmd(jsi::Runtime &runtime,
                                  const jsi::Object &object,
                                  Variables &variables)
      : Command(CommandType::PushColorFilter,
                "skSRGBToLinearGammaColorFilter") {}

  void pushColorFilter(DrawingCtx *ctx) {
    auto cf = SkColorFilters::SRGBToLinearGamma();
    ctx->colorFilters.push_back(cf);
  }
};

class LumaColorFilterCmd : public Command {
public:
  LumaColorFilterCmd(jsi::Runtime &runtime, const jsi::Object &object,
                     Variables &variables)
      : Command(CommandType::PushColorFilter, "skLumaColorFilter") {}

  void pushColorFilter(DrawingCtx *ctx) {
    auto cf = SkLumaColorFilter::Make();
    ctx->colorFilters.push_back(cf);
  }
};

struct LerpColorFilterProps {
  float t;
};

class LerpColorFilterCmd : public Command {
private:
  LerpColorFilterProps props;

public:
  LerpColorFilterCmd(jsi::Runtime &runtime, const jsi::Object &object,
                     Variables &variables)
      : Command(CommandType::PushColorFilter, "skLerpColorFilter") {
    convertProperty(runtime, object, "t", props.t, variables);
  }

  void pushColorFilter(DrawingCtx *ctx) {
    if (ctx->colorFilters.size() >= 2) {
      auto second = ctx->colorFilters.back();
      ctx->colorFilters.pop_back();
      auto first = ctx->colorFilters.back();
      ctx->colorFilters.pop_back();

      auto cf = SkColorFilters::Lerp(props.t, first, second);
      ctx->colorFilters.push_back(cf);
    } else {
      // Handle error - not enough filters
      // Could throw an exception or handle gracefully
    }
  }
};

} // namespace RNSkia
