#pragma once

#include <optional>
#include <string>
#include <variant>

#include "Command.h"
#include "Convertor.h"
#include "DrawingCtx.h"

namespace RNSkia {

struct BlurMaskFilterCmdProps {
  float blur;
  SkBlurStyle style;
  bool respectCTM;
};

class BlurMaskFilterCmd : public Command {
private:
  BlurMaskFilterCmdProps props;

public:
  BlurMaskFilterCmd(jsi::Runtime &runtime, const jsi::Object &object,
                    Variables &variables)
      : Command(CommandType::PushBlurMaskFilter, "skBlurMaskFilter") {
    convertProperty(runtime, object, "blur", props.blur, variables);
    convertProperty(runtime, object, "style", props.style, variables);
    convertProperty(runtime, object, "respectCTM", props.respectCTM, variables);
  }

  void pushMaskFilter(DrawingCtx *ctx) {
    auto [blur, style, respectCTM] = props;
    auto maskFilter = SkMaskFilter::MakeBlur(style, blur, respectCTM);
    ctx->getPaint().setMaskFilter(maskFilter);
  }
};

struct BlurImageFilterProps {
  Radius blur;
  SkTileMode mode;
};

class BlurImageFilterCmd : public Command {
private:
  BlurImageFilterProps props;

public:
  BlurImageFilterCmd(jsi::Runtime &runtime, const jsi::Object &object,
                     Variables &variables)
      : Command(CommandType::PushImageFilter, "skBlurImageFilter") {
    convertProperty(runtime, object, "blur", props.blur, variables);
    convertProperty(runtime, object, "mode", props.mode, variables);
  }

  void pushImageFilter(DrawingCtx *ctx) {
    auto imgf =
        SkImageFilters::Blur(props.blur.rX, props.blur.rY, props.mode, nullptr);
    ctx->imageFilters.push_back(imgf);
  }
};

struct OffsetImageFilterProps {
  float x;
  float y;
};

class OffsetImageFilterCmd : public Command {
private:
  OffsetImageFilterProps props;

public:
  OffsetImageFilterCmd(jsi::Runtime &runtime, const jsi::Object &object,
                       Variables &variables)
      : Command(CommandType::PushImageFilter, "skOffsetImageFilter") {
    convertProperty(runtime, object, "x", props.x, variables);
    convertProperty(runtime, object, "y", props.y, variables);
  }

  void pushImageFilter(DrawingCtx *ctx) {
    auto imgf = SkImageFilters::Offset(props.x, props.y, nullptr);
    ctx->imageFilters.push_back(imgf);
  }
};

struct DisplacementMapImageFilterProps {
  SkColorChannel channelX;
  SkColorChannel channelY;
  float scale;
};

class DisplacementMapImageFilterCmd : public Command {
private:
  DisplacementMapImageFilterProps props;

public:
  DisplacementMapImageFilterCmd(jsi::Runtime &runtime,
                                const jsi::Object &object, Variables &variables)
      : Command(CommandType::PushImageFilter, "skDisplacementMapImageFilter") {
    convertProperty(runtime, object, "channelX", props.channelX, variables);
    convertProperty(runtime, object, "channelY", props.channelY, variables);
    convertProperty(runtime, object, "scale", props.scale, variables);
  }

  void pushImageFilter(DrawingCtx *ctx) {
    auto shader = ctx->shaders.back();
    ctx->shaders.pop_back();
    auto map = SkImageFilters::Shader(shader, nullptr);
    auto imgf = SkImageFilters::DisplacementMap(props.channelX, props.channelY,
                                                props.scale, map, nullptr);
    ctx->imageFilters.push_back(imgf);
  }
};

struct DropShadowImageFilterProps {
  float dx;
  float dy;
  float blur;
  SkColor color;
  std::optional<bool> inner;
  std::optional<bool> shadowOnly;
};

class DropShadowImageFilterCmd : public Command {
private:
  DropShadowImageFilterProps props;

  sk_sp<SkImageFilter> MakeInnerShadow(bool shadowOnly, float dx, float dy,
                                       float sigmaX, float sigmaY,
                                       SkColor color,
                                       sk_sp<SkImageFilter> input) {
    auto sourceGraphic = SkImageFilters::ColorFilter(
        SkColorFilters::Blend(SK_ColorBLACK, SkBlendMode::kDst), nullptr);

    auto sourceAlpha = SkImageFilters::ColorFilter(
        SkColorFilters::Blend(SK_ColorBLACK, SkBlendMode::kSrcIn), nullptr);

    // The shadow is generated outside the shape and then clipped back into it,
    // so "outside" has to be the complement of the shape's silhouette. Taking
    // SrcOut against the source graphic itself makes it the complement of the
    // source's *alpha*: inside a translucent shape 1 - alpha is non-zero, so
    // the shadow is generated across the whole interior and tints it, no matter
    // how small the blur and the offset are (issue #2990). Saturating alpha
    // first keeps the shadow tied to the shape's outline instead of to its
    // opacity. 255 is the saturation point of an 8-bit alpha channel, so one
    // unit of coverage is enough to reach 1.
    static constexpr float kAlphaSaturate[20] = {
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 0};
    auto coverage = SkImageFilters::ColorFilter(
        SkColorFilters::Matrix(kAlphaSaturate), nullptr);

    auto f1 = SkImageFilters::ColorFilter(
        SkColorFilters::Blend(color, SkBlendMode::kSrcOut), coverage);

    auto f2 = SkImageFilters::Offset(dx, dy, f1);
    auto f3 = SkImageFilters::Blur(sigmaX, sigmaY, SkTileMode::kDecal, f2);
    auto f4 = SkImageFilters::Blend(SkBlendMode::kSrcIn, sourceAlpha, f3);

    if (shadowOnly) {
      return f4;
    }

    return SkImageFilters::Compose(
        input, SkImageFilters::Blend(SkBlendMode::kSrcOver, sourceGraphic, f4));
  }

public:
  DropShadowImageFilterCmd(jsi::Runtime &runtime, const jsi::Object &object,
                           Variables &variables)
      : Command(CommandType::PushImageFilter, "skDropShadowImageFilter") {
    convertProperty(runtime, object, "dx", props.dx, variables);
    convertProperty(runtime, object, "dy", props.dy, variables);
    convertProperty(runtime, object, "blur", props.blur, variables);
    convertProperty(runtime, object, "color", props.color, variables);
    convertProperty(runtime, object, "inner", props.inner, variables);
    convertProperty(runtime, object, "shadowOnly", props.shadowOnly, variables);
  }

  void pushImageFilter(DrawingCtx *ctx) {
    auto shadowOnly = props.shadowOnly.value_or(false);
    auto inner = props.inner.value_or(false);

    sk_sp<SkImageFilter> imgf;
    if (inner) {
      imgf = MakeInnerShadow(shadowOnly, props.dx, props.dy, props.blur,
                             props.blur, props.color, nullptr);
    } else {
      if (shadowOnly) {
        imgf = SkImageFilters::DropShadowOnly(props.dx, props.dy, props.blur,
                                              props.blur, props.color, nullptr);
      } else {
        imgf = SkImageFilters::DropShadow(props.dx, props.dy, props.blur,
                                          props.blur, props.color, nullptr);
      }
    }
    ctx->imageFilters.push_back(imgf);
  }
};

struct MorphologyImageFilterProps {
  std::string op; // "erode" or "dilate"
  Radius radius;
};

class MorphologyImageFilterCmd : public Command {
private:
  MorphologyImageFilterProps props;

public:
  MorphologyImageFilterCmd(jsi::Runtime &runtime, const jsi::Object &object,
                           Variables &variables)
      : Command(CommandType::PushImageFilter, "skMorphologyImageFilter") {
    convertProperty(runtime, object, "operator", props.op, variables);
    convertProperty(runtime, object, "radius", props.radius, variables);
  }

  void pushImageFilter(DrawingCtx *ctx) {
    if (props.op == "erode") {
      auto imgf =
          SkImageFilters::Erode(props.radius.rX, props.radius.rY, nullptr);
      ctx->imageFilters.push_back(imgf);
    } else {
      auto imgf =
          SkImageFilters::Dilate(props.radius.rX, props.radius.rY, nullptr);
      ctx->imageFilters.push_back(imgf);
    }
  }
};

struct BlendImageFilterProps {
  SkBlendMode mode;
};

class BlendImageFilterCmd : public Command {
private:
  BlendImageFilterProps props;

public:
  BlendImageFilterCmd(jsi::Runtime &runtime, const jsi::Object &object,
                      Variables &variables)
      : Command(CommandType::PushImageFilter, "skBlendImageFilter") {
    convertProperty(runtime, object, "mode", props.mode, variables);
  }

  void pushImageFilter(DrawingCtx *ctx) {
    // Get all filters
    auto filters = std::move(ctx->imageFilters);
    ctx->imageFilters.clear();

    // Create composer function
    auto composer = [this](sk_sp<SkImageFilter> outer,
                           sk_sp<SkImageFilter> inner) {
      return SkImageFilters::Blend(props.mode, outer, inner);
    };

    // Compose filters
    auto composedFilter = composeEffects<SkImageFilter>(filters, composer);

    if (composedFilter) {
      ctx->imageFilters.push_back(composedFilter);
    }
  }
};

struct RuntimeShaderImageFilterProps {
  sk_sp<SkRuntimeEffect> source;
  std::optional<Uniforms> uniforms;
};

class RuntimeShaderImageFilterCmd : public Command {
private:
  RuntimeShaderImageFilterProps props;

public:
  RuntimeShaderImageFilterCmd(jsi::Runtime &runtime, const jsi::Object &object,
                              Variables &variables)
      : Command(CommandType::PushImageFilter, "skRuntimeShaderImageFilter") {
    convertProperty(runtime, object, "source", props.source, variables);
    convertProperty(runtime, object, "uniforms", props.uniforms, variables);
  }

  void pushImageFilter(DrawingCtx *ctx) {
    if (props.source) {
      // Create the runtime shader builder
      SkRuntimeShaderBuilder builder(props.source);

      // Process uniforms if present
      if (props.uniforms.has_value()) {
        processUniforms(builder, props.source, props.uniforms.value());
      }

      // Get the input filter (if any)
      sk_sp<SkImageFilter> input = nullptr;
      if (!ctx->imageFilters.empty()) {
        input = ctx->imageFilters.back();
        ctx->imageFilters.pop_back();
      }

      // Create and push the runtime shader image filter
      auto imgf = SkImageFilters::RuntimeShader(builder, "", input);
      ctx->imageFilters.push_back(imgf);
    }
  }
};

struct ImageFilterCmdProps {
  sk_sp<SkImageFilter> filter;
};

class ImageFilterCmd : public Command {
private:
  ImageFilterCmdProps props;

public:
  ImageFilterCmd(jsi::Runtime &runtime, const jsi::Object &object,
                 Variables &variables)
      : Command(CommandType::PushImageFilter, "skImageFilter") {
    convertProperty(runtime, object, "filter", props.filter, variables);
  }

  void pushImageFilter(DrawingCtx *ctx) {
    ctx->imageFilters.push_back(props.filter);
  }
};

} // namespace RNSkia
