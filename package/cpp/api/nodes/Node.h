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
        std::vector<std::shared_ptr<Node>> children;
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

        std::shared_ptr<SkPaint> processPaint(SkPaint *parentPaint);

    public:
        Node(jsi::Runtime &runtime, jsi::Object &props): runtime(runtime), props(std::move(props)) {}
        ~Node() {

        }

        virtual std::string name() = 0;

        void appendChild(std::shared_ptr<Node> node) {
            children.push_back(std::move(node));
        }

        virtual void render(SkCanvas* canvas, SkPaint* paint) {
            for (auto it = children.begin() ; it != children.end(); ++it) {
                auto item = (*it);
                item->render(canvas, paint);
            }
        }

        void setProps(jsi::Object lProps) {
          //  props = lProps;
        }

        void removeChild(std::shared_ptr<Node> node) {
        }

        void insertBefore(std::shared_ptr<Node> before, std::shared_ptr<Node> node) {

        }

        void clearChildren() {
            children.clear();
        }
    };
} // namespace RNSkia
