#pragma once

#include <memory>
#include <optional>
#include <utility>

#include "JsiSkContourMeasure.h"
#include "JsiSkNativeObjects.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkContourMeasure.h"

#include "JsiSkPath.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkContourMeasureIter
    : public JsiSkWrappingSharedPtrNativeObject<JsiSkContourMeasureIter,
                                                SkContourMeasureIter> {
public:
  static constexpr const char *CLASS_NAME = "ContourMeasureIter";

  JsiSkContourMeasureIter(std::shared_ptr<RNSkPlatformContext> context,
                          const SkPath &path, bool forceClosed,
                          SkScalar resScale = 1)
      : JsiSkWrappingSharedPtrNativeObject<JsiSkContourMeasureIter,
                                           SkContourMeasureIter>(
            std::move(context), std::make_shared<SkContourMeasureIter>(
                                    path, forceClosed, resScale)) {}

  std::optional<std::shared_ptr<JsiSkContourMeasure>> next() {
    auto next = getObject()->next();
    if (next == nullptr) {
      return std::nullopt;
    }
    return std::make_shared<JsiSkContourMeasure>(getContext(),
                                                 std::move(next));
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    installMethod(runtime, prototype, "next", &JsiSkContourMeasureIter::next);
  }

  size_t getMemoryPressure() override {
    return std::max(sizeof(SkContourMeasureIter), kMinMemoryPressure);
  }

  /**
   * Creates the function for construction a new instance of the
   * SkContourMeasureIter wrapper
   * @param context platform context
   * @return A function for creating a new host object wrapper for the
   * SkContourMeasureIter class
   */
  static const jsi::HostFunctionType
  createCtor(std::shared_ptr<RNSkPlatformContext> context) {
    return JSI_HOST_FUNCTION_LAMBDA {
      auto path = JsiSkPath::fromValue(runtime, arguments[0]);
      auto forceClosed = arguments[1].getBool();
      auto resScale = arguments[2].asNumber();
      // Return the newly constructed object
      return makeJsiObject(runtime, std::make_shared<JsiSkContourMeasureIter>(
                                        std::move(context), path->snapshot(),
                                        forceClosed, resScale));
    };
  }
};
} // namespace RNSkia
