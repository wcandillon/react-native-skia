#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include <JsiSkHostObjects.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "modules/sksg/include/SkSGOpacityEffect.h"
#include <values/RNSkReadonlyValue.h>

#include "nodes/JsiSkSGGeometryNode.h"

#pragma clang diagnostic pop

namespace RNSkia {

    using namespace facebook;

    class JsiSkSGOpacityEffect: public JsiSkWrappingSkPtrHostObject<sksg::OpacityEffect> {
    public:

        JsiSkSGOpacityEffect(std::shared_ptr<RNSkPlatformContext> context, sk_sp<sksg::OpacityEffect> node)
                : JsiSkWrappingSkPtrHostObject<sksg::OpacityEffect>(
                context, std::move(node)) {};

        JSI_PROPERTY_GET(__typename__) {
                return jsi::String::createFromUtf8(runtime, "OpacityEffect");
        }

        JSI_EXPORT_PROPERTY_GETTERS(JSI_EXPORT_PROP_GET(JsiSkSGOpacityEffect, __typename__))

        JSI_HOST_FUNCTION(to) {
            // TODO: std::move?
            return jsi::Object::createFromHostObject(
                runtime, std::make_shared<JsiSkRenderNode>(getContext(), getObject()));
        }

        JSI_HOST_FUNCTION(setOpacity) {
            auto o = arguments[0].asNumber();
            getObject()->setOpacity(o);
            return jsi::Value::undefined();
        }

        JSI_EXPORT_FUNCTIONS(
            JSI_EXPORT_FUNC(JsiSkSGOpacityEffect, setOpacity),
            JSI_EXPORT_FUNC(JsiSkSGOpacityEffect, to),
        )

        static sk_sp<sksg::OpacityEffect> fromValue(jsi::Runtime &runtime,
                                           const jsi::Value &obj) {
            return obj.asObject(runtime)
                    .asHostObject<JsiSkSGOpacityEffect>(runtime)
                    ->getObject();
        }
    };

} // namespace RNSkia