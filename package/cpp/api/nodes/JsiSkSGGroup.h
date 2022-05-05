#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include <JsiSkHostObjects.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "modules/sksg/include/SkSGRect.h"
#include <values/RNSkReadonlyValue.h>

#pragma clang diagnostic pop

namespace RNSkia {

    using namespace facebook;

    class JsiSkSGGroup: public JsiSkWrappingSkPtrHostObject<sksg::Group> {
    public:

        JsiSkSGGroup(std::shared_ptr<RNSkPlatformContext> context, sk_sp<sksg::Group> node)
                : JsiSkWrappingSkPtrHostObject<sksg::Group>(
                context, std::move(node)) {};

        JSI_HOST_FUNCTION(addChild) {
            auto child = JsiSkRenderNode::fromValue(runtime, arguments[0]);
            getObject()->addChild(child);
            return jsi::Value::undefined();
        }

        JSI_PROPERTY_GET(__typename__) {
                return jsi::String::createFromUtf8(runtime, "Group");
        }

        JSI_EXPORT_PROPERTY_GETTERS(JSI_EXPORT_PROP_GET(JsiSkSGGroup, __typename__))

        JSI_EXPORT_FUNCTIONS(
            JSI_EXPORT_FUNC(JsiSkSGGroup, addChild)
        )

        static sk_sp<sksg::Group> fromValue(jsi::Runtime &runtime,
                                           const jsi::Value &obj) {
            return obj.asObject(runtime)
                    .asHostObject<JsiSkSGGroup>(runtime)
                    ->getObject();
        }
    };

} // namespace RNSkia