#include "Node.h"

#include "third_party/CSSColorParser.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"
#pragma clang diagnostic pop

namespace RNSkia {

    using namespace facebook;

    SkPaint Node::processPaint(SkPaint &parentPaint) {
        SkPaint paint(parentPaint);
        auto color = props.getProperty(runtime, "color");
        if (color.isNumber()) {
            paint.setColor(materializeNumber("color"));
        } else if (color.isString()) {
            auto cl = CSSColorParser::parse(materializeString("color"));
            int a = round(cl.a * 255);
            paint.setColor((a << 24) | (cl.r << 16) | (cl.g << 8) | cl.b);
        }
        return paint;
    }
}