#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include <JsiSkHostObjects.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"


#include <values/RNSkReadonlyValue.h>

#pragma clang diagnostic pop

namespace RNSkia {

    using namespace facebook;

class JsiSkRenderNode: public JsiSkWrappingSkPtrHostObject<sksg::RenderNode> {
    public:

    JsiSkRenderNode(std::shared_ptr<RNSkPlatformContext> context, sk_sp<sksg::RenderNode> node)
                : JsiSkWrappingSkPtrHostObject<sksg::RenderNode>(
                context, std::move(node)) {};

        JSI_PROPERTY_GET(__typename__) {
                return jsi::String::createFromUtf8(runtime, "RenderNode");
        }

        JSI_EXPORT_PROPERTY_GETTERS(JSI_EXPORT_PROP_GET(JsiSkRenderNode, __typename__))


//        JSI_EXPORT_FUNCTIONS(
//          JSI_EXPORT_FUNC(JsiSkNode, setProps)
//        )

        static sk_sp<sksg::RenderNode> fromValue(jsi::Runtime &runtime,
                                               const jsi::Value &obj) {
            return obj.asObject(runtime)
                    .asHostObject<JsiSkRenderNode>(runtime)
                    ->getObject();
        }
    };

} // namespace RNSkia