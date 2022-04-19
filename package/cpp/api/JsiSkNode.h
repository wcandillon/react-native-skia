#pragma once

#include "nodes/Node.h"

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include <JsiSkHostObjects.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include <modules/svg/include/SkSVGDOM.h>

#include <values/RNSkReadonlyValue.h>

#pragma clang diagnostic pop

namespace RNSkia {

    using namespace facebook;

    class JsiSkNode: public JsiSkWrappingSharedPtrHostObject<Node> {
    public:

        JsiSkNode(std::shared_ptr<RNSkPlatformContext> context, std::shared_ptr<Node> node)
                : JsiSkWrappingSharedPtrHostObject<Node>(
                context, std::move(node)){};

        JSI_PROPERTY_GET(__typename__) {
            return jsi::String::createFromUtf8(runtime, getObject()->name());
        }

        JSI_EXPORT_PROPERTY_GETTERS(JSI_EXPORT_PROP_GET(JsiSkNode, __typename__))

        JSI_HOST_FUNCTION(appendChild) {
            auto node = JsiSkNode::fromValue(runtime, arguments[0]);
            getObject()->appendChild(node);
            return jsi::Value::undefined();
        }

        JSI_HOST_FUNCTION(setProps) {

            return jsi::Value::undefined();
        }

        JSI_HOST_FUNCTION(insertBefore) {
            auto before = JsiSkNode::fromValue(runtime, arguments[0]);
            auto node = JsiSkNode::fromValue(runtime, arguments[1]);

            return jsi::Value::undefined();
        }

        JSI_HOST_FUNCTION(clearChildren) {
            getObject()->clearChildren();
            return jsi::Value::undefined();
        }

        JSI_EXPORT_FUNCTIONS(
                JSI_EXPORT_FUNC(JsiSkNode, setProps),
                JSI_EXPORT_FUNC(JsiSkNode, insertBefore),
                JSI_EXPORT_FUNC(JsiSkNode, appendChild),
                JSI_EXPORT_FUNC(JsiSkNode, clearChildren))

        static std::shared_ptr<Node> fromValue(jsi::Runtime &runtime,
                                               const jsi::Value &obj) {
            return obj.asObject(runtime)
                    .asHostObject<JsiSkNode>(runtime)
                    ->getObject();
        }
    };

} // namespace RNSkia
