#pragma once

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

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

        jsi::Value materialize(const char* name) {
            auto value = props.getProperty(runtime, name);
            // TODO: check if is host object of derived value
            // TODO: support other skia values than derived values
            if (value.isObject() && value.getObject(runtime).isHostObject(runtime)) {
                return value.asObject(runtime)
                        .asHostObject<RNSkReadonlyValue>(runtime)
                        ->getCurrent(runtime);
            }
            return value;
        }

        SkPaint processPaint(SkPaint &parentPaint);

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
