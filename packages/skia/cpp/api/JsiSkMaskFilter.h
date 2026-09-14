#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkNativeObjects.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkMaskFilter.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkMaskFilter
    : public JsiSkWrappingSkPtrNativeObject<JsiSkMaskFilter, SkMaskFilter> {
public:
  static constexpr const char *CLASS_NAME = "MaskFilter";

  JsiSkMaskFilter(std::shared_ptr<RNSkPlatformContext> context,
                  sk_sp<SkMaskFilter> maskFilter)
      : JsiSkWrappingSkPtrNativeObject<JsiSkMaskFilter, SkMaskFilter>(
            std::move(context), std::move(maskFilter)) {}

  size_t getMemoryPressure() override { return 2048; }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
  }

  /**
    Returns the underlying object from a host object of this type
   */
  static sk_sp<SkMaskFilter> fromValue(jsi::Runtime &runtime,
                                       const jsi::Value &obj) {
    return objectFromValue(runtime, obj);
  }
};

} // namespace RNSkia
