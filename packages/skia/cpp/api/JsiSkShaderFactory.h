#pragma once

#include <memory>
#include <utility>
#include <vector>

#include <jsi/jsi.h>

#include "JsiSkColor.h"
#include "JsiSkColorFilter.h"
#include "JsiSkConverters.h"
#include "JsiSkMatrix.h"
#include "JsiSkNativeObjects.h"
#include "JsiSkPoint.h"
#include "JsiSkShader.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkColorFilter.h"
#include "include/effects/SkImageFilters.h"
#include "include/effects/SkPerlinNoiseShader.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkShaderFactory : public JsiSkNativeObject<JsiSkShaderFactory> {
public:
  static constexpr const char *CLASS_NAME = "ShaderFactory";

  std::shared_ptr<JsiSkShader>
  MakeLinearGradient(SkPoint p1, SkPoint p2,
                     JsiOptional<std::vector<JsiColor>> jsiColors,
                     JsiOptional<std::vector<float>> jsiPositions,
                     JsiOptional<double> tileMode,
                     JsiOptional<std::shared_ptr<SkMatrix>> matrix,
                     JsiOptional<double> flag) {
    SkPoint pts[] = {p1, p2};
    auto colors = toColors(jsiColors);
    auto positions = toPositions(jsiPositions, colors.size());
    SkGradient::Colors gradColors(SkSpan(colors), toSpan(positions),
                                  toTileMode(tileMode));
    SkGradient grad(gradColors,
                    SkGradient::Interpolation::FromFlags(toFlag(flag)));
    sk_sp<SkShader> gradient =
        SkShaders::LinearGradient(pts, grad, toLocalMatrix(matrix));
    return std::make_shared<JsiSkShader>(getContext(), std::move(gradient));
  }

  std::shared_ptr<JsiSkShader>
  MakeRadialGradient(SkPoint center, double r,
                     JsiOptional<std::vector<JsiColor>> jsiColors,
                     JsiOptional<std::vector<float>> jsiPositions,
                     JsiOptional<double> tileMode,
                     JsiOptional<std::shared_ptr<SkMatrix>> matrix,
                     JsiOptional<double> flag) {
    auto colors = toColors(jsiColors);
    auto positions = toPositions(jsiPositions, colors.size());
    SkGradient::Colors gradColors(SkSpan(colors), toSpan(positions),
                                  toTileMode(tileMode));
    SkGradient grad(gradColors,
                    SkGradient::Interpolation::FromFlags(toFlag(flag)));
    sk_sp<SkShader> gradient =
        SkShaders::RadialGradient(center, r, grad, toLocalMatrix(matrix));
    return std::make_shared<JsiSkShader>(getContext(), std::move(gradient));
  }

  std::shared_ptr<JsiSkShader>
  MakeSweepGradient(double x, double y,
                    JsiOptional<std::vector<JsiColor>> jsiColors,
                    JsiOptional<std::vector<float>> jsiPositions,
                    JsiOptional<double> tileMode,
                    JsiOptional<std::shared_ptr<SkMatrix>> matrix,
                    JsiOptional<double> flag, JsiOptional<double> start,
                    JsiOptional<double> end) {
    auto colors = toColors(jsiColors);
    auto positions = toPositions(jsiPositions, colors.size());
    auto startAngle =
        start.has_value() ? static_cast<float>(*start) : 0.0f;
    auto endAngle = end.has_value() ? static_cast<float>(*end) : 360.0f;
    SkGradient::Colors gradColors(SkSpan(colors), toSpan(positions),
                                  toTileMode(tileMode));
    SkGradient grad(gradColors,
                    SkGradient::Interpolation::FromFlags(toFlag(flag)));
    sk_sp<SkShader> gradient =
        SkShaders::SweepGradient(SkPoint::Make(x, y), startAngle, endAngle,
                                 grad, toLocalMatrix(matrix));
    return std::make_shared<JsiSkShader>(getContext(), std::move(gradient));
  }

  std::shared_ptr<JsiSkShader>
  MakeTwoPointConicalGradient(SkPoint start, double startRadius, SkPoint end,
                              double endRadius,
                              JsiOptional<std::vector<JsiColor>> jsiColors,
                              JsiOptional<std::vector<float>> jsiPositions,
                              JsiOptional<double> tileMode,
                              JsiOptional<std::shared_ptr<SkMatrix>> matrix,
                              JsiOptional<double> flag) {
    auto colors = toColors(jsiColors);
    auto positions = toPositions(jsiPositions, colors.size());
    SkGradient::Colors gradColors(SkSpan(colors), toSpan(positions),
                                  toTileMode(tileMode));
    SkGradient grad(gradColors,
                    SkGradient::Interpolation::FromFlags(toFlag(flag)));
    sk_sp<SkShader> gradient = SkShaders::TwoPointConicalGradient(
        start, startRadius, end, endRadius, grad, toLocalMatrix(matrix));
    return std::make_shared<JsiSkShader>(getContext(), std::move(gradient));
  }

  std::shared_ptr<JsiSkShader> MakeTurbulence(double baseFreqX,
                                              double baseFreqY, double octaves,
                                              double seed, double tileW,
                                              double tileH) {
    SkISize size = SkISize::Make(tileW, tileH);
    sk_sp<SkShader> gradient =
        SkShaders::MakeTurbulence(baseFreqX, baseFreqY, octaves, seed, &size);
    return std::make_shared<JsiSkShader>(getContext(), std::move(gradient));
  }

  std::shared_ptr<JsiSkShader> MakeFractalNoise(double baseFreqX,
                                                double baseFreqY,
                                                double octaves, double seed,
                                                double tileW, double tileH) {
    SkISize size = SkISize::Make(tileW, tileH);
    sk_sp<SkShader> gradient =
        SkShaders::MakeFractalNoise(baseFreqX, baseFreqY, octaves, seed, &size);
    return std::make_shared<JsiSkShader>(getContext(), std::move(gradient));
  }

  std::shared_ptr<JsiSkShader> MakeBlend(double blendMode, sk_sp<SkShader> one,
                                         sk_sp<SkShader> two) {
    sk_sp<SkShader> gradient =
        SkShaders::Blend(static_cast<SkBlendMode>(blendMode), one, two);
    return std::make_shared<JsiSkShader>(getContext(), std::move(gradient));
  }

  std::shared_ptr<JsiSkShader> MakeColor(JsiColor color) {
    sk_sp<SkShader> gradient = SkShaders::Color(color);
    return std::make_shared<JsiSkShader>(getContext(), std::move(gradient));
  }

  size_t getMemoryPressure() override { return 1024; }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installMethod(runtime, prototype, "MakeLinearGradient",
                  &JsiSkShaderFactory::MakeLinearGradient);
    installMethod(runtime, prototype, "MakeRadialGradient",
                  &JsiSkShaderFactory::MakeRadialGradient);
    installMethod(runtime, prototype, "MakeSweepGradient",
                  &JsiSkShaderFactory::MakeSweepGradient);
    installMethod(runtime, prototype, "MakeTwoPointConicalGradient",
                  &JsiSkShaderFactory::MakeTwoPointConicalGradient);
    installMethod(runtime, prototype, "MakeTurbulence",
                  &JsiSkShaderFactory::MakeTurbulence);
    installMethod(runtime, prototype, "MakeFractalNoise",
                  &JsiSkShaderFactory::MakeFractalNoise);
    installMethod(runtime, prototype, "MakeBlend",
                  &JsiSkShaderFactory::MakeBlend);
    installMethod(runtime, prototype, "MakeColor",
                  &JsiSkShaderFactory::MakeColor);
  }

  explicit JsiSkShaderFactory(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkNativeObject<JsiSkShaderFactory>(std::move(context)) {}

private:
  static std::vector<SkColor4f>
  toColors(const JsiOptional<std::vector<JsiColor>> &jsiColors) {
    std::vector<SkColor4f> colors;
    if (jsiColors.has_value()) {
      colors.reserve(jsiColors->size());
      for (const auto &color : *jsiColors) {
        colors.push_back(SkColor4f::FromColor(color));
      }
    }
    if (colors.size() < 2) {
      throw std::invalid_argument("colors must have at least 2 colors");
    }
    return colors;
  }

  static std::vector<float>
  toPositions(const JsiOptional<std::vector<float>> &jsiPositions,
              size_t colorsSize) {
    std::vector<float> positions =
        jsiPositions.has_value() ? *jsiPositions : std::vector<float>{};
    if (!positions.empty() && positions.size() != colorsSize) {
      throw std::invalid_argument(
          "positions must be empty or have the same size as colors");
    }
    return positions;
  }

  static SkSpan<const float> toSpan(const std::vector<float> &positions) {
    return !positions.empty()
               ? SkSpan<const float>(positions.data(), positions.size())
               : SkSpan<const float>();
  }

  static SkTileMode toTileMode(const JsiOptional<double> &tileMode) {
    return tileMode.has_value() ? static_cast<SkTileMode>(*tileMode)
                                : SkTileMode::kClamp;
  }

  static int toFlag(const JsiOptional<double> &flag) {
    return flag.has_value() ? static_cast<int>(*flag) : 0;
  }

  static SkMatrix *
  toLocalMatrix(const JsiOptional<std::shared_ptr<SkMatrix>> &matrix) {
    return matrix.has_value() ? matrix->get() : nullptr;
  }
};

} // namespace RNSkia
