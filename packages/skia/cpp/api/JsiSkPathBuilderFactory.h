#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkConverters.h"
#include "JsiSkNativeObjects.h"
#include "JsiSkPath.h"
#include "JsiSkPathBuilder.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkPath.h"
#include "include/core/SkPathBuilder.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkPathBuilderFactory
    : public JsiSkNativeObject<JsiSkPathBuilderFactory> {
public:
  static constexpr const char *CLASS_NAME = "PathBuilderFactory";

  std::shared_ptr<JsiSkPathBuilder> Make() {
    return std::make_shared<JsiSkPathBuilder>(getContext(), SkPathBuilder());
  }

  std::shared_ptr<JsiSkPathBuilder>
  MakeFromPath(std::shared_ptr<SkPathBuilder> path) {
    return std::make_shared<JsiSkPathBuilder>(getContext(),
                                              SkPathBuilder(*path));
  }

  size_t getMemoryPressure() override { return 1024; }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installMethod(runtime, prototype, "Make", &JsiSkPathBuilderFactory::Make);
    installMethod(runtime, prototype, "MakeFromPath",
                  &JsiSkPathBuilderFactory::MakeFromPath);
  }

  explicit JsiSkPathBuilderFactory(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkNativeObject<JsiSkPathBuilderFactory>(std::move(context)) {}
};

} // namespace RNSkia
