#pragma once

#include <optional>
#include <string>
#include <variant>

#include <include/core/SkSamplingOptions.h>

#include "Command.h"
#include "Convertor.h"
#include "DrawingCtx.h"
#include "ImageFit.h"

namespace RNSkia {

struct PushShaderProps : TransformProps {
  sk_sp<SkRuntimeEffect> source;
  Uniforms uniforms;
};

class PushShaderCmd : public Command {
private:
  PushShaderProps props;

public:
  PushShaderCmd(jsi::Runtime &runtime, const jsi::Object &object,
                Variables &variables)
      : Command(CommandType::PushShader, "skShader") {
    convertProperty(runtime, object, "transform", props.transform, variables);
    convertProperty(runtime, object, "origin", props.origin, variables);
    convertProperty(runtime, object, "matrix", props.matrix, variables);
    convertProperty(runtime, object, "source", props.source, variables);
    convertProperty(runtime, object, "uniforms", props.uniforms, variables);
  }

  void pushShader(DrawingCtx *ctx) {
    auto source = props.source;
    auto uniforms = props.uniforms;
    auto m3 = processTransform(props.matrix, props.transform, props.origin);
    auto uniformsData = processUniforms(source, props.uniforms);

    std::vector<sk_sp<SkShader>> children = ctx->popAllShaders();
    auto shader = source->makeShader(std::move(uniformsData), children.data(),
                                     children.size(), &m3);

    ctx->shaders.push_back(shader);
  }
};

struct PushImageShaderProps : TransformProps {
  SkTileMode tx;
  SkTileMode ty;
  float x = 0;
  float y = 0;
  std::optional<float> width;
  std::optional<float> height;
  std::optional<SkRect> rect;
  std::string fit;
  std::optional<sk_sp<SkImage>> image;
  std::optional<SkSamplingOptions> sampling;
};

class PushImageShaderCmd : public Command {
private:
  PushImageShaderProps props;

public:
  PushImageShaderCmd(jsi::Runtime &runtime, const jsi::Object &object,
                     Variables &variables)
      : Command(CommandType::PushShader, "skImageShader") {
    convertProperty(runtime, object, "tx", props.tx, variables);
    convertProperty(runtime, object, "ty", props.ty, variables);
    convertProperty(runtime, object, "rect", props.rect, variables);
    convertProperty(runtime, object, "image", props.image, variables);
    convertProperty(runtime, object, "sampling", props.sampling, variables);

    convertProperty(runtime, object, "transform", props.transform, variables);
    convertProperty(runtime, object, "origin", props.origin, variables);
    convertProperty(runtime, object, "matrix", props.matrix, variables);

    convertProperty(runtime, object, "fit", props.fit, variables);
    convertProperty(runtime, object, "x", props.x, variables);
    convertProperty(runtime, object, "y", props.y, variables);
    convertProperty(runtime, object, "width", props.width, variables);
    convertProperty(runtime, object, "height", props.height, variables);
    convertProperty(runtime, object, "rect", props.rect, variables);
  }

  void pushShader(DrawingCtx *ctx) {
    auto x = props.x;
    auto y = props.y;
    auto width = props.width;
    auto height = props.height;
    auto rect = props.rect;
    if (props.image.has_value()) {
      auto img = props.image.value();
      SkMatrix m33;
      auto hasRect =
          rect.has_value() || (width.has_value() && height.has_value());
      if (hasRect) {
        auto src = SkRect::MakeXYWH(0, 0, img->width(), img->height());
        auto dst = rect.has_value()
                       ? rect.value()
                       : SkRect::MakeXYWH(x, y, width.value(), height.value());
        auto rects = RNSkiaImage::fitRects(props.fit, src, dst);
        auto m = RNSkiaImage::rect2rect(rects.src, rects.dst);
        m33.preConcat(m);
      }
      SkMatrix lm;
      lm.preConcat(m33);
      auto m3 = processTransform(props.matrix, props.transform, props.origin);
      lm.preConcat(m3);
      auto shader = img->makeShader(
          props.tx, props.ty,
          props.sampling.value_or(SkSamplingOptions(SkFilterMode::kLinear)),
          &lm);
      ctx->shaders.push_back(shader);
    }
  }
};

struct GradientProps : TransformProps {
  std::vector<SkColor> colors;
  std::optional<std::vector<float>> positions;
  std::optional<SkTileMode> mode;
  std::optional<uint32_t> flags;
};

struct ColorShaderProps {
  SkColor color;
};

class ColorShaderCmd : public Command {
private:
  ColorShaderProps props;

public:
  ColorShaderCmd(jsi::Runtime &runtime, const jsi::Object &object,
                 Variables &variables)
      : Command(CommandType::PushShader, "skColorShader") {
    convertProperty(runtime, object, "color", props.color, variables);
  }

  void pushShader(DrawingCtx *ctx) {
    auto shader = SkShaders::Color(props.color);
    ctx->shaders.push_back(shader);
  }
};

struct TurbulenceProps {
  float freqX;
  float freqY;
  int octaves;
  float seed;
  float tileWidth;
  float tileHeight;
};

class TurbulenceCmd : public Command {
private:
  TurbulenceProps props;

public:
  TurbulenceCmd(jsi::Runtime &runtime, const jsi::Object &object,
                Variables &variables)
      : Command(CommandType::PushShader, "skTurbulence") {
    convertProperty(runtime, object, "freqX", props.freqX, variables);
    convertProperty(runtime, object, "freqY", props.freqY, variables);
    convertProperty(runtime, object, "octaves", props.octaves, variables);
    convertProperty(runtime, object, "seed", props.seed, variables);
    convertProperty(runtime, object, "tileWidth", props.tileWidth, variables);
    convertProperty(runtime, object, "tileHeight", props.tileHeight, variables);
  }

  void pushShader(DrawingCtx *ctx) {
    auto size = SkISize::Make(props.tileWidth, props.tileHeight);
    auto shader = SkShaders::MakeTurbulence(props.freqX, props.freqY,
                                            props.octaves, props.seed, &size);
    ctx->shaders.push_back(shader);
  }
};

struct FractalNoiseProps {
  float freqX;
  float freqY;
  int octaves;
  float seed;
  float tileWidth;
  float tileHeight;
};

class FractalNoiseCmd : public Command {
private:
  FractalNoiseProps props;

public:
  FractalNoiseCmd(jsi::Runtime &runtime, const jsi::Object &object,
                  Variables &variables)
      : Command(CommandType::PushShader, "skFractalNoise") {
    convertProperty(runtime, object, "freqX", props.freqX, variables);
    convertProperty(runtime, object, "freqY", props.freqY, variables);
    convertProperty(runtime, object, "octaves", props.octaves, variables);
    convertProperty(runtime, object, "seed", props.seed, variables);
    convertProperty(runtime, object, "tileWidth", props.tileWidth, variables);
    convertProperty(runtime, object, "tileHeight", props.tileHeight, variables);
  }

  void pushShader(DrawingCtx *ctx) {
    auto size = SkISize::Make(props.tileWidth, props.tileHeight);
    auto shader = SkShaders::MakeFractalNoise(props.freqX, props.freqY,
                                              props.octaves, props.seed, &size);
    ctx->shaders.push_back(shader);
  }
};

struct LinearGradientProps : GradientProps {
  SkPoint start;
  SkPoint end;
};

class LinearGradientCmd : public Command {
private:
  LinearGradientProps props;

public:
  LinearGradientCmd(jsi::Runtime &runtime, const jsi::Object &object,
                    Variables &variables)
      : Command(CommandType::PushShader, "skLinearGradient") {
    convertProperty(runtime, object, "start", props.start, variables);
    convertProperty(runtime, object, "end", props.end, variables);
    convertProperty(runtime, object, "colors", props.colors, variables);
    convertProperty(runtime, object, "positions", props.positions, variables);
    convertProperty(runtime, object, "mode", props.mode, variables);
    convertProperty(runtime, object, "flags", props.flags, variables);

    convertProperty(runtime, object, "transform", props.transform, variables);
    convertProperty(runtime, object, "origin", props.origin, variables);
    convertProperty(runtime, object, "matrix", props.matrix, variables);
  }

  void pushShader(DrawingCtx *ctx) {
    // Validate colors array has at least 2 colors
    if (props.colors.size() < 2) {
      throw std::invalid_argument("Colors array must have at least 2 colors");
    }
    
    // Validate positions array matches colors array in size
    if (props.positions.has_value() && props.positions.value().size() != props.colors.size()) {
      throw std::invalid_argument("Positions array must have the same size as colors array");
    }
    
    SkMatrix m3 = processTransform(props.matrix, props.transform, props.origin);
    const SkPoint pts[2] = {props.start, props.end};
    auto shader = SkGradientShader::MakeLinear(
        pts, props.colors.data(),
        props.positions ? props.positions->data() : nullptr,
        props.colors.size(), props.mode.value_or(SkTileMode::kClamp),
        props.flags.value_or(0), &m3);
    ctx->shaders.push_back(shader);
  }
};

struct RadialGradientProps : GradientProps {
  SkPoint center;
  float radius;
};

class RadialGradientCmd : public Command {
private:
  RadialGradientProps props;

public:
  RadialGradientCmd(jsi::Runtime &runtime, const jsi::Object &object,
                    Variables &variables)
      : Command(CommandType::PushShader, "skRadialGradient") {
    convertProperty(runtime, object, "c", props.center, variables);
    convertProperty(runtime, object, "r", props.radius, variables);
    convertProperty(runtime, object, "colors", props.colors, variables);
    convertProperty(runtime, object, "positions", props.positions, variables);
    convertProperty(runtime, object, "mode", props.mode, variables);
    convertProperty(runtime, object, "flags", props.flags, variables);

    convertProperty(runtime, object, "transform", props.transform, variables);
    convertProperty(runtime, object, "origin", props.origin, variables);
    convertProperty(runtime, object, "matrix", props.matrix, variables);
  }

  void pushShader(DrawingCtx *ctx) {
    // Validate colors array has at least 2 colors
    if (props.colors.size() < 2) {
      throw std::invalid_argument("Colors array must have at least 2 colors");
    }
    
    // Validate positions array matches colors array in size
    if (props.positions.has_value() && props.positions.value().size() != props.colors.size()) {
      throw std::invalid_argument("Positions array must have the same size as colors array");
    }
    
    SkMatrix m3 = processTransform(props.matrix, props.transform, props.origin);
    auto shader = SkGradientShader::MakeRadial(
        props.center, props.radius, props.colors.data(),
        props.positions ? props.positions->data() : nullptr,
        props.colors.size(), props.mode.value_or(SkTileMode::kClamp),
        props.flags.value_or(0), &m3);
    ctx->shaders.push_back(shader);
  }
};

struct SweepGradientProps : GradientProps {
  SkPoint center;
  std::optional<float> start;
  std::optional<float> end;
};

class SweepGradientCmd : public Command {
private:
  SweepGradientProps props;

public:
  SweepGradientCmd(jsi::Runtime &runtime, const jsi::Object &object,
                   Variables &variables)
      : Command(CommandType::PushShader, "skSweepGradient") {
    convertProperty(runtime, object, "c", props.center, variables);
    convertProperty(runtime, object, "start", props.start, variables);
    convertProperty(runtime, object, "end", props.end, variables);
    convertProperty(runtime, object, "colors", props.colors, variables);
    convertProperty(runtime, object, "positions", props.positions, variables);
    convertProperty(runtime, object, "mode", props.mode, variables);
    convertProperty(runtime, object, "flags", props.flags, variables);

    convertProperty(runtime, object, "transform", props.transform, variables);
    convertProperty(runtime, object, "origin", props.origin, variables);
    convertProperty(runtime, object, "matrix", props.matrix, variables);
  }

  void pushShader(DrawingCtx *ctx) {
    // Validate colors array has at least 2 colors
    if (props.colors.size() < 2) {
      throw std::invalid_argument("Colors array must have at least 2 colors");
    }
    
    // Validate positions array matches colors array in size
    if (props.positions.has_value() && props.positions.value().size() != props.colors.size()) {
      throw std::invalid_argument("Positions array must have the same size as colors array");
    }
    
    SkMatrix m3 = processTransform(props.matrix, props.transform, props.origin);
    auto shader = SkGradientShader::MakeSweep(
        props.center.x(), props.center.y(), props.colors.data(),
        props.positions ? props.positions->data() : nullptr,
        props.colors.size(), props.mode.value_or(SkTileMode::kClamp),
        props.start.value_or(0), props.end.value_or(360),
        props.flags.value_or(0), &m3);
    ctx->shaders.push_back(shader);
  }
};

struct TwoPointConicalGradientProps : GradientProps {
  SkPoint start;
  float startRadius;
  SkPoint end;
  float endRadius;
};

class TwoPointConicalGradientCmd : public Command {
private:
  TwoPointConicalGradientProps props;

public:
  TwoPointConicalGradientCmd(jsi::Runtime &runtime, const jsi::Object &object,
                             Variables &variables)
      : Command(CommandType::PushShader, "skTwoPointConicalGradient") {
    convertProperty(runtime, object, "start", props.start, variables);
    convertProperty(runtime, object, "startR", props.startRadius, variables);
    convertProperty(runtime, object, "end", props.end, variables);
    convertProperty(runtime, object, "endR", props.endRadius, variables);
    convertProperty(runtime, object, "colors", props.colors, variables);
    convertProperty(runtime, object, "positions", props.positions, variables);
    convertProperty(runtime, object, "mode", props.mode, variables);
    convertProperty(runtime, object, "flags", props.flags, variables);

    convertProperty(runtime, object, "transform", props.transform, variables);
    convertProperty(runtime, object, "origin", props.origin, variables);
    convertProperty(runtime, object, "matrix", props.matrix, variables);
  }

  void pushShader(DrawingCtx *ctx) {
    // Validate colors array has at least 2 colors
    if (props.colors.size() < 2) {
      throw std::invalid_argument("Colors array must have at least 2 colors");
    }
    
    // Validate positions array matches colors array in size
    if (props.positions.has_value() && props.positions.value().size() != props.colors.size()) {
      throw std::invalid_argument("Positions array must have the same size as colors array");
    }
    
    SkMatrix m3 = processTransform(props.matrix, props.transform, props.origin);
    auto shader = SkGradientShader::MakeTwoPointConical(
        props.start, props.startRadius, props.end, props.endRadius,
        props.colors.data(),
        props.positions ? props.positions->data() : nullptr,
        props.colors.size(), props.mode.value_or(SkTileMode::kClamp),
        props.flags.value_or(0), &m3);
    ctx->shaders.push_back(shader);
  }
};

struct BlendShaderProps {
  SkBlendMode mode;
};

class BlendShaderCmd : public Command {
private:
  BlendShaderProps props;

public:
  BlendShaderCmd(jsi::Runtime &runtime, const jsi::Object &object,
                 Variables &variables)
      : Command(CommandType::PushShader, "skBlendShader") {
    convertProperty(runtime, object, "mode", props.mode, variables);
  }

  void pushShader(DrawingCtx *ctx) {
    // Get all existing shaders from the context
    std::vector<sk_sp<SkShader>> shaders = ctx->popAllShaders();

    // We need at least 2 shaders to blend
    if (shaders.size() >= 2) {
      // Start from the last shader and blend backwards
      sk_sp<SkShader> blendedShader = shaders.back();

      // Iterate from second-to-last to first shader
      for (int i = shaders.size() - 2; i >= 0; i--) {
        blendedShader = SkShaders::Blend(props.mode, shaders[i], blendedShader);
      }

      ctx->shaders.push_back(blendedShader);
    } else if (shaders.size() == 1) {
      // If only one shader, just push it back
      ctx->shaders.push_back(shaders[0]);
    }
  }
};

} // namespace RNSkia
