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

  std::shared_ptr<JsiSkPathEffect> MakeCorner(int radius) {
    return std::make_shared<JsiSkPathEffect>(getContext(),
                                             SkCornerPathEffect::Make(radius));
  }

  std::shared_ptr<JsiSkPathEffect>
  MakeDash(std::vector<float> intervals, JsiOptional<double> phaseValue) {
    int phase = phaseValue.has_value() ? *phaseValue : 0;
    auto i = SkSpan(intervals.data(), intervals.size());
    return std::make_shared<JsiSkPathEffect>(getContext(),
                                             SkDashPathEffect::Make(i, phase));
  }

  std::shared_ptr<JsiSkPathEffect> MakeDiscrete(int segLength, int dec,
                                                int seedAssist) {
    return std::make_shared<JsiSkPathEffect>(
        getContext(), SkDiscretePathEffect::Make(segLength, dec, seedAssist));
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
    return std::make_shared<JsiSkPathEffect>(
        getContext(),
        SkPath1DPathEffect::Make(
            path->snapshot(), advance, phase,
            static_cast<SkPath1DPathEffect::Style>(style)));
  }

  std::shared_ptr<JsiSkPathEffect>
  MakePath2D(std::shared_ptr<SkMatrix> matrix,
             std::shared_ptr<SkPathBuilder> path) {
    return std::make_shared<JsiSkPathEffect>(
        getContext(), SkPath2DPathEffect::Make(*matrix, path->snapshot()));
  }

  std::shared_ptr<JsiSkPathEffect>
  MakeLine2D(double width, std::shared_ptr<SkMatrix> matrix) {
    return std::make_shared<JsiSkPathEffect>(
        getContext(), SkLine2DPathEffect::Make(width, *matrix));
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
