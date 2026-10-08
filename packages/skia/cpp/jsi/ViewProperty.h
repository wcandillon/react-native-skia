#pragma once

#include <functional>
#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <utility>
#include <variant>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkPicture.h"

#pragma clang diagnostic pop

namespace RNSkia {
class Recorder;
}

namespace RNJsi {
namespace jsi = facebook::jsi;

class ViewProperty {
public:
  /**
   * Probes the JS value for the native objects a view can display (a picture
   * or a recorder); anything else yields an empty property. Defined in
   * ViewProperty.cpp: the recorder headers depend on the include order
   * established by JsiSkApi.h, which this header (included by every platform
   * view) must not pull in.
   */
  ViewProperty(jsi::Runtime &runtime, const jsi::Value &value);

  bool isPicture() { return std::holds_alternative<sk_sp<SkPicture>>(_value); }

  bool isRecorder() {
    return std::holds_alternative<std::shared_ptr<RNSkia::Recorder>>(_value);
  }

  sk_sp<SkPicture> getPicture() { return std::get<sk_sp<SkPicture>>(_value); }

  std::shared_ptr<RNSkia::Recorder> getRecorder() {
    return std::get<std::shared_ptr<RNSkia::Recorder>>(_value);
  }

private:
  std::variant<std::nullptr_t, sk_sp<SkPicture>,
               std::shared_ptr<RNSkia::Recorder>>
      _value = nullptr;
};
} // namespace RNJsi
