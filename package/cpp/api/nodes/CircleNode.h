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
    public:
        NodeCircle(jsi::Runtime &runtime, jsi::Object &props): Node(runtime, props) {}

        std::string name() {
            return "CircleNode";
        }

        void render(SkCanvas* canvas, SkPaint& parentPaint) {
            auto cx = materializeNumber("cx");
            auto cy = materializeNumber("cy");
            auto r = materializeNumber("r");
            auto paint = processPaint(parentPaint);
            canvas->drawCircle(cx, cy, r, paint);
        }
    };
} // namespace RNSkia
