#pragma once

#include <functional>
#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <variant>

#include "api/JsiSkPicture.h"

namespace RNJsi {
namespace jsi = facebook::jsi;

class ViewProperty {
public:
  ViewProperty(jsi::Runtime &runtime, const jsi::Value &value) {
    auto jsiPicture =
        RNSkia::tryGetJsiObject<RNSkia::JsiSkPicture>(runtime, value);
    if (jsiPicture) {
      _value = jsiPicture->getObject();
    }
  }

  template <typename PlatformContext>
  ViewProperty(jsi::Runtime &runtime, const jsi::Value &value,
               PlatformContext platformContext, size_t nativeId) {}

  bool isNull() { return std::holds_alternative<std::nullptr_t>(_value); }

  sk_sp<SkPicture> getPicture() { return std::get<sk_sp<SkPicture>>(_value); }

private:
  std::variant<std::nullptr_t, sk_sp<SkPicture>> _value = nullptr;
};
} // namespace RNJsi
