#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkHostObjects.h"
#include "JsiSkPath2.h"

#include "include/core/SkPath.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkPath2Factory : public JsiSkHostObject {
public:
  JSI_HOST_FUNCTION(Make) { return JsiSkPath2::create(runtime, SkPath()); }

  size_t getMemoryPressure() const override { return 1024; }

  std::string getObjectType() const override { return "JsiSkPath2Factory"; }

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiSkPath2Factory, Make))

  explicit JsiSkPath2Factory(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkHostObject(std::move(context)) {}
};

} // namespace RNSkia
