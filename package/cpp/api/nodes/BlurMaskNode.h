#pragma once

#include "Node.h"

#include <SkMaskFilter.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"
#pragma clang diagnostic pop

namespace RNSkia {

    using namespace facebook;

    class BlurMaskNode: public Node {
    public:
        BlurMaskNode(jsi::Runtime &runtime, jsi::Object &props): Node(runtime, props) {}

        std::string name() {
            return "BlurMaskNode";
        }

        void render(SkCanvas* canvas, SkPaint& paint) {
            auto style = materialize("style").asNumber();
            auto blur = materialize("blur").asNumber();
            auto respectCTM = materialize("respectCTM").getBool();
            auto mf = SkMaskFilter::MakeBlur(static_cast<SkBlurStyle>(style), blur, respectCTM);
            paint.setMaskFilter(mf);
        }
    };
} // namespace RNSkia
