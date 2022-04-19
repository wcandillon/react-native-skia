#include "Node.h"

#include "third_party/CSSColorParser.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"
#pragma clang diagnostic pop

namespace RNSkia {

    using namespace facebook;

    std::shared_ptr<SkPaint> Node::processPaint(SkPaint* parentPaint) {
        auto paint = std::make_shared<SkPaint>(*parentPaint);
        auto color = materialize("color");
        auto opacity = materialize("opacity");
        auto a = parentPaint->getAlphaf();
        if (opacity.isNumber()) {
            a = a * opacity.asNumber();
        }
        if (color.isNumber()) {
            paint->setColor(color.asNumber());
        } else if (color.isString()) {
            auto cl = CSSColorParser::parse(color.asString(runtime).utf8(runtime));
            int a1 = round(cl.a * 255);
            paint->setColor((a1 << 24) | (cl.r << 16) | (cl.g << 8) | cl.b);
        }
        paint->setAlphaf(a * paint->getAlphaf());
        return paint;
    }
}