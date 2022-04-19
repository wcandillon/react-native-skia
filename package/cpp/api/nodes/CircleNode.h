#pragma once

#include "Node.h"

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include <JsiSkHostObjects.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"


#include <values/RNSkReadonlyValue.h>

#pragma clang diagnostic pop

namespace RNSkia {

    using namespace facebook;

    class NodeCircle: public Node {
    private:
        jsi::Runtime &runtime;
        jsi::Object props;
    public:
        NodeCircle(jsi::Runtime &runtime, jsi::Object &props): Node(), runtime(runtime), props(std::move(props)) {}

        std::string name() {
            return "NodeCircle";
        }

        void render(SkCanvas* canvas, SkPaint* paint) {
            double cx = materializeNumber(runtime, props, "cx");
            double cy = materializeNumber(runtime, props, "cy");
            double r = materializeNumber(runtime, props, "r");
            paint->setColor(SK_ColorCYAN);
            canvas->drawCircle(cx, cy, r, *paint);
        }
    };
} // namespace RNSkia
