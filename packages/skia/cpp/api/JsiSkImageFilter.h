#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkNativeObjects.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/effects/SkImageFilters.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkImageFilter
    : public JsiSkWrappingSkPtrNativeObject<JsiSkImageFilter, SkImageFilter> {
public:
  static constexpr const char *CLASS_NAME = "ImageFilter";

  JsiSkImageFilter(std::shared_ptr<RNSkPlatformContext> context,
                   sk_sp<SkImageFilter> imageFilter)
      : JsiSkWrappingSkPtrNativeObject<JsiSkImageFilter, SkImageFilter>(
            std::move(context), std::move(imageFilter)) {}

  size_t getMemoryPressure() override { return 1024 * 1024; }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
  }

  /**
    Returns the underlying object from a host object of this type
   */
  static sk_sp<SkImageFilter> fromValue(jsi::Runtime &runtime,
                                        const jsi::Value &obj) {
    return objectFromValue(runtime, obj);
  }
};

} // namespace RNSkia
