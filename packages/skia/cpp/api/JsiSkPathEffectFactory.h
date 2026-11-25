#pragma once

#include <memory>
#include <optional>
#include <utility>
#include <variant>
#include <vector>

#include <jsi/jsi.h>

#include "JsiSkConverters.h"
#include "JsiSkMatrix.h"
#include "JsiSkNativeObjects.h"
#include "JsiSkPath.h"
#include "JsiSkPathEffect.h"
#include "SkiaErrors.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkPathEffect.h"
#include "include/effects/Sk1DPathEffect.h"
#include "include/effects/Sk2DPathEffect.h"
#include "include/effects/SkCornerPathEffect.h"
#include "include/effects/SkDashPathEffect.h"
#include "include/effects/SkDiscretePathEffect.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkPathEffectFactory
    : public JsiSkNativeObject<JsiSkPathEffectFactory> {
public:
  static constexpr const char *CLASS_NAME = "PathEffectFactory";

  // No effect for a radius of zero or less: null, which setPathEffect()
  // takes as is (a radius animated down to zero, say).
  std::variant<std::nullptr_t, std::shared_ptr<JsiSkPathEffect>>
  MakeCorner(double radius) {
    auto effect = SkCornerPathEffect::Make(radius);
    if (effect == nullptr) {
      return nullptr;
    }
    return std::make_shared<JsiSkPathEffect>(getContext(), std::move(effect));
  }

  std::shared_ptr<JsiSkPathEffect> MakeDash(std::vector<float> intervals,
                                            JsiOptional<double> phaseValue) {
    int phase = phaseValue.has_value() ? *phaseValue : 0;
    auto i = SkSpan(intervals.data(), intervals.size());
    auto effect = SkDashPathEffect::Make(i, phase);
    if (effect == nullptr) {
      throw SkiaErrors::validation(
          "MakeDash: the intervals must be an even count of non-negative "
          "numbers whose sum is positive");
    }
    return std::make_shared<JsiSkPathEffect>(getContext(), std::move(effect));
  }

  std::shared_ptr<JsiSkPathEffect> MakeDiscrete(int segLength, int dec,
                                                int seedAssist) {
    auto effect = SkDiscretePathEffect::Make(segLength, dec, seedAssist);
    if (effect == nullptr) {
      throw SkiaErrors::validation("MakeDiscrete: segLength must be positive");
    }
    return std::make_shared<JsiSkPathEffect>(getContext(), std::move(effect));
  }

  std::shared_ptr<JsiSkPathEffect> MakeCompose(sk_sp<SkPathEffect> outer,
                                               sk_sp<SkPathEffect> inner) {
    return std::make_shared<JsiSkPathEffect>(
        getContext(),
        SkPathEffect::MakeCompose(std::move(outer), std::move(inner)));
  }

  std::shared_ptr<JsiSkPathEffect> MakeSum(sk_sp<SkPathEffect> outer,
                                           sk_sp<SkPathEffect> inner) {
    return std::make_shared<JsiSkPathEffect>(
        getContext(),
        SkPathEffect::MakeSum(std::move(outer), std::move(inner)));
  }

  std::shared_ptr<JsiSkPathEffect>
  MakePath1D(std::shared_ptr<SkPathBuilder> path, double advance, double phase,
             double style) {
    auto effect =
        SkPath1DPathEffect::Make(path->snapshot(), advance, phase,
                                 static_cast<SkPath1DPathEffect::Style>(style));
    if (effect == nullptr) {
      throw SkiaErrors::validation(
          "MakePath1D: the advance must be positive and the path not empty");
    }
    return std::make_shared<JsiSkPathEffect>(getContext(), std::move(effect));
  }

  std::shared_ptr<JsiSkPathEffect>
  MakePath2D(std::shared_ptr<SkMatrix> matrix,
             std::shared_ptr<SkPathBuilder> path) {
    auto effect = SkPath2DPathEffect::Make(*matrix, path->snapshot());
    if (effect == nullptr) {
      throw SkiaErrors::validation("MakePath2D: the matrix must be invertible");
    }
    return std::make_shared<JsiSkPathEffect>(getContext(), std::move(effect));
  }

  std::shared_ptr<JsiSkPathEffect>
  MakeLine2D(double width, std::shared_ptr<SkMatrix> matrix) {
    auto effect = SkLine2DPathEffect::Make(width, *matrix);
    if (effect == nullptr) {
      throw SkiaErrors::validation(
          "MakeLine2D: the width must be 0 or more and the matrix invertible");
    }
    return std::make_shared<JsiSkPathEffect>(getContext(), std::move(effect));
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installMethod(runtime, prototype, "MakeCorner",
                  &JsiSkPathEffectFactory::MakeCorner);
    installMethod(runtime, prototype, "MakeDash",
                  &JsiSkPathEffectFactory::MakeDash);
    installMethod(runtime, prototype, "MakeDiscrete",
                  &JsiSkPathEffectFactory::MakeDiscrete);
    installMethod(runtime, prototype, "MakeCompose",
                  &JsiSkPathEffectFactory::MakeCompose);
    installMethod(runtime, prototype, "MakeSum",
                  &JsiSkPathEffectFactory::MakeSum);
    installMethod(runtime, prototype, "MakeLine2D",
                  &JsiSkPathEffectFactory::MakeLine2D);
    installMethod(runtime, prototype, "MakePath1D",
                  &JsiSkPathEffectFactory::MakePath1D);
    installMethod(runtime, prototype, "MakePath2D",
                  &JsiSkPathEffectFactory::MakePath2D);
  }

  size_t getMemoryPressure() override { return 1024; }

  explicit JsiSkPathEffectFactory(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkNativeObject<JsiSkPathEffectFactory>(std::move(context)) {}
};

} // namespace RNSkia
