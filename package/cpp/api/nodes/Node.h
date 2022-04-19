#pragma once

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "third_party/CSSColorParser.h"

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include <values/RNSkReadonlyValue.h>

#include <SkPaint.h>
#include <SkCanvas.h>

#pragma clang diagnostic pop

namespace RNSkia {

    using namespace facebook;

    class Node {
    protected:
        std::vector<Node*> children;
        jsi::Runtime &runtime;
        jsi::Object props;

        double materializeNumber(const char* name) {
            auto value = props.getProperty(runtime, name);
            if (value.isObject()) {
                return value.asObject(runtime)
                        .asHostObject<RNSkReadonlyValue>(runtime)
                        ->getCurrent(runtime).asNumber();
            }
            return value.asNumber();
        }

        SkPaint processPaint(SkPaint &parentPaint) {
            SkPaint paint(parentPaint);
            auto color = props.getProperty(runtime, "color");
            if (color.isNumber()) {
                paint.setColor(color.asNumber());
            } else if (color.isString()) {
                auto cl = CSSColorParser::parse(color.asString(runtime).utf8(runtime));
                int a = round(cl.a * 255);
                paint.setColor((a << 24) | (cl.r << 16) | (cl.g << 8) | cl.b);
            }
            return paint;
        }

    public:
        Node(jsi::Runtime &runtime, jsi::Object &props): runtime(runtime), props(std::move(props)) {}

        virtual std::string name() = 0;

        void appendChild(Node* node) {
            children.push_back(node);
        }

        virtual void render(SkCanvas* canvas, SkPaint& paint) {
            for (auto it = children.begin() ; it != children.end(); ++it) {
                (*it)->render(canvas, paint);
            }
        }
    };
} // namespace RNSkia
