#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkColorFilter.h"
#include "JsiSkConverters.h"
#include "JsiSkMaskFilter.h"
#include "JsiSkNativeObjects.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkMaskFilter.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkMaskFilterFactory
    : public JsiSkNativeObject<JsiSkMaskFilterFactory> {
public:
  static constexpr const char *CLASS_NAME = "MaskFilterFactory";

  std::shared_ptr<JsiSkMaskFilter> MakeBlur(int blurStyle, float sigma,
                                            bool respectCTM) {
    return std::make_shared<JsiSkMaskFilter>(
        getContext(), SkMaskFilter::MakeBlur(static_cast<SkBlurStyle>(blurStyle),
                                             sigma, respectCTM));
  }

  size_t getMemoryPressure() override { return 1024; }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installMethod(runtime, prototype, "MakeBlur",
                  &JsiSkMaskFilterFactory::MakeBlur);
  }

  explicit JsiSkMaskFilterFactory(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkNativeObject<JsiSkMaskFilterFactory>(std::move(context)) {}
};

} // namespace RNSkia
