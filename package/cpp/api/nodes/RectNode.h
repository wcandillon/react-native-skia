#pragma once

#include "Node.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"
#pragma clang diagnostic pop

namespace RNSkia {

    using namespace facebook;


    class RectNode: public Node {
    public:
        RectNode(jsi::Runtime &runtime, jsi::Object &props): Node(runtime, props) {}

        std::string name() {
            return "RectNode";
        }

        void render(SkCanvas* canvas, SkPaint* parentPaint) {
            auto x = materialize("x").asNumber();
            auto y = materialize("y").asNumber();
            auto w = materialize("width").asNumber();
            auto h = materialize("height").asNumber();
            auto paint = processPaint(parentPaint);
            auto rect = SkRect::MakeXYWH(x, y, w, h);
            canvas->drawRect(rect, *paint);
        }
    };
} // namespace RNSkia
