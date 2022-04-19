#pragma once

#include "Node.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"
#pragma clang diagnostic pop

namespace RNSkia {

    using namespace facebook;

    class FillNode: public Node {
    public:
        FillNode(jsi::Runtime &runtime, jsi::Object &props): Node(runtime, props) {}

        std::string name() {
            return "FillNode";
        }

        void render(SkCanvas* canvas, SkPaint* parentPaint) {
            auto paint = processPaint(parentPaint);
            canvas->drawPaint(*paint);
        }
    };
} // namespace RNSkia
