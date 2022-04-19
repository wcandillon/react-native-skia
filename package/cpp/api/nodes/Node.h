#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include <values/RNSkReadonlyValue.h>

#pragma clang diagnostic pop

namespace RNSkia {

    using namespace facebook;

    class Node {
    protected:
        std::vector<Node*> children;

        double materializeNumber(jsi::Runtime &runtime, jsi::Object &props, const char* name) {
            auto value = props.getProperty(runtime, name);
            if (value.isObject()) {
                return value.asObject(runtime)
                        .asHostObject<RNSkReadonlyValue>(runtime)
                        ->getCurrent(runtime).asNumber();
            }
            return value.asNumber();
        }

    public:
        Node() {}

        virtual std::string name() = 0;

        void appendChild(Node* node) {
            children.push_back(node);
        }

        virtual void render(SkCanvas* canvas, SkPaint* paint) {
            for (auto it = children.begin() ; it != children.end(); ++it) {
                (*it)->render(canvas, paint);
            }
        }
    };
} // namespace RNSkia
