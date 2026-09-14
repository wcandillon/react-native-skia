#pragma once

#include "JsiSkColor.h"
#include "JsiSkColorFilter.h"
#include "JsiSkConverters.h"
#include "JsiSkNativeObjects.h"
#include <jsi/jsi.h>
#include <memory>
#include <utility>
#include <vector>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkColorFilter.h"
#include "include/effects/SkLumaColorFilter.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkColorFilterFactory
    : public JsiSkNativeObject<JsiSkColorFilterFactory> {
public:
  static constexpr const char *CLASS_NAME = "ColorFilterFactory";

  std::shared_ptr<JsiSkColorFilter> MakeMatrix(std::vector<float> values) {
    float matrix[20] = {0};
    for (size_t i = 0; i < 20 && i < values.size(); i++) {
      matrix[i] = values[i];
    }
    return std::make_shared<JsiSkColorFilter>(getContext(),
                                              SkColorFilters::Matrix(matrix));
  }

  std::shared_ptr<JsiSkColorFilter> MakeBlend(JsiColor color, double blend) {
    return std::make_shared<JsiSkColorFilter>(
        getContext(),
        SkColorFilters::Blend(color, static_cast<SkBlendMode>(blend)));
  }

  std::shared_ptr<JsiSkColorFilter> MakeCompose(sk_sp<SkColorFilter> outer,
                                                sk_sp<SkColorFilter> inner) {
    return std::make_shared<JsiSkColorFilter>(
        getContext(),
        SkColorFilters::Compose(std::move(outer), std::move(inner)));
  }

  std::shared_ptr<JsiSkColorFilter> MakeLerp(double t,
                                             sk_sp<SkColorFilter> dst,
                                             sk_sp<SkColorFilter> src) {
    return std::make_shared<JsiSkColorFilter>(
        getContext(), SkColorFilters::Lerp(t, std::move(dst), std::move(src)));
  }

  std::shared_ptr<JsiSkColorFilter> MakeSRGBToLinearGamma() {
    return std::make_shared<JsiSkColorFilter>(
        getContext(), SkColorFilters::SRGBToLinearGamma());
  }

  std::shared_ptr<JsiSkColorFilter> MakeLinearToSRGBGamma() {
    return std::make_shared<JsiSkColorFilter>(
        getContext(), SkColorFilters::LinearToSRGBGamma());
  }

  std::shared_ptr<JsiSkColorFilter> MakeLumaColorFilter() {
    return std::make_shared<JsiSkColorFilter>(getContext(),
                                              SkLumaColorFilter::Make());
  }

  size_t getMemoryPressure() override { return 1024; }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installMethod(runtime, prototype, "MakeMatrix",
                  &JsiSkColorFilterFactory::MakeMatrix);
    installMethod(runtime, prototype, "MakeBlend",
                  &JsiSkColorFilterFactory::MakeBlend);
    installMethod(runtime, prototype, "MakeCompose",
                  &JsiSkColorFilterFactory::MakeCompose);
    installMethod(runtime, prototype, "MakeLerp",
                  &JsiSkColorFilterFactory::MakeLerp);
    installMethod(runtime, prototype, "MakeSRGBToLinearGamma",
                  &JsiSkColorFilterFactory::MakeSRGBToLinearGamma);
    installMethod(runtime, prototype, "MakeLinearToSRGBGamma",
                  &JsiSkColorFilterFactory::MakeLinearToSRGBGamma);
    installMethod(runtime, prototype, "MakeLumaColorFilter",
                  &JsiSkColorFilterFactory::MakeLumaColorFilter);
  }

  explicit JsiSkColorFilterFactory(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkNativeObject<JsiSkColorFilterFactory>(std::move(context)) {}
};
} // namespace RNSkia
