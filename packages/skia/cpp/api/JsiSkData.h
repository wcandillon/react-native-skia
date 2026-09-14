#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkNativeObjects.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkFont.h"
#include "include/core/SkStream.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkData : public JsiSkWrappingSkPtrNativeObject<JsiSkData, SkData> {
public:
  static constexpr const char *CLASS_NAME = "Data";

  JsiSkData(std::shared_ptr<RNSkPlatformContext> context, sk_sp<SkData> asset)
      : JsiSkWrappingSkPtrNativeObject<JsiSkData, SkData>(std::move(context),
                                                          std::move(asset)) {}

  size_t getMemoryPressure() override {
    auto data = getObject();
    return data ? data->size() : 0;
  }

  static sk_sp<SkData> fromValue(jsi::Runtime &runtime, const jsi::Value &obj) {
    return objectFromValue(runtime, obj);
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
  }
};
} // namespace RNSkia
