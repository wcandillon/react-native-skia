#pragma once

#include <jsi/jsi.h>
#include <string>

#include "include/core/SkPath.h"

#include "../jsi/JSClass.h"
#include "../jsi/JSTypeTraits.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkPath2 : public RNJsi::JSClass<SkPath, JsiSkPath2> {
public:
  JsiSkPath2() = default;

  // Simple test method - no Skia calls
  std::string hello() { return "world"; }

  void loadHybridMethods() override {
    registerHybridMethod("hello", &JsiSkPath2::hello, this);
  }

  size_t getMemoryPressure() const override { return 0; }
};

} // namespace RNSkia
