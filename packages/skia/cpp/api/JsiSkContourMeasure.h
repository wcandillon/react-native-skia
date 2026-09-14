#pragma once

#include <memory>
#include <utility>
#include <vector>

#include <jsi/jsi.h>

#include "JsiSkNativeObjects.h"
#include "JsiSkPoint.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkContourMeasure.h"

#include "JsiSkPath.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkContourMeasure
    : public JsiSkWrappingSkPtrNativeObject<JsiSkContourMeasure,
                                            SkContourMeasure> {
public:
  static constexpr const char *CLASS_NAME = "ContourMeasure";

  JsiSkContourMeasure(std::shared_ptr<RNSkPlatformContext> context,
                      const sk_sp<SkContourMeasure> contourMeasure)
      : JsiSkWrappingSkPtrNativeObject<JsiSkContourMeasure, SkContourMeasure>(
            std::move(context), std::move(contourMeasure)) {}

  std::vector<std::shared_ptr<JsiSkPoint>> getPosTan(double dist) {
    SkPoint position;
    SkPoint tangent;
    auto result = getObject()->getPosTan(dist, &position, &tangent);
    if (!result) {
      throw std::runtime_error("getPosTan() failed");
    }
    return {std::make_shared<JsiSkPoint>(getContext(), position),
            std::make_shared<JsiSkPoint>(getContext(), tangent)};
  }

  double length() { return SkScalarToDouble(getObject()->length()); }

  bool isClosed() { return getObject()->isClosed(); }

  std::shared_ptr<JsiSkPath> getSegment(double start, double end,
                                        bool startWithMoveTo) {
    SkPathBuilder builder;
    auto result =
        getObject()->getSegment(start, end, &builder, startWithMoveTo);
    if (!result) {
      throw std::runtime_error("getSegment() failed");
    }
    return std::make_shared<JsiSkPath>(getContext(), builder.snapshot());
  }

  size_t getMemoryPressure() override { return 1024; }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    installMethod(runtime, prototype, "getPosTan",
                  &JsiSkContourMeasure::getPosTan);
    installMethod(runtime, prototype, "length", &JsiSkContourMeasure::length);
    installMethod(runtime, prototype, "isClosed",
                  &JsiSkContourMeasure::isClosed);
    installMethod(runtime, prototype, "getSegment",
                  &JsiSkContourMeasure::getSegment);
  }
};
} // namespace RNSkia
