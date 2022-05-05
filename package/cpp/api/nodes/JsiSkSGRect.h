#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include <JsiSkHostObjects.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "modules/sksg/include/SkSGRect.h"
#include <values/RNSkReadonlyValue.h>

#include "nodes/JsiSkSGGeometryNode.h"

#pragma clang diagnostic pop

namespace RNSkia {

    using namespace facebook;

    class JsiSkSGRect: public JsiSkWrappingSkPtrHostObject<sksg::Rect> {
    public:

        JsiSkSGRect(std::shared_ptr<RNSkPlatformContext> context, sk_sp<sksg::Rect> node)
                : JsiSkWrappingSkPtrHostObject<sksg::Rect>(
                context, std::move(node)) {};

        JSI_PROPERTY_GET(__typename__) {
            return jsi::String::createFromUtf8(runtime, "Rect");
        }

        JSI_EXPORT_PROPERTY_GETTERS(JSI_EXPORT_PROP_GET(JsiSkSGRect, __typename__))

        JSI_HOST_FUNCTION(to) {
            // TODO: std::move?
            return jsi::Object::createFromHostObject(
                    runtime, std::make_shared<JsiSkSGGeometryNode>(getContext(), getObject()));
        }

        JSI_HOST_FUNCTION(setL) {
            auto l = arguments[0].asNumber();
            getObject()->setL(l);
            return jsi::Value::undefined();
        }

        JSI_HOST_FUNCTION(setR) {
            auto r = arguments[0].asNumber();
            getObject()->setR(r);
            return jsi::Value::undefined();
        }

        JSI_HOST_FUNCTION(setT) {
            auto t = arguments[0].asNumber();
            getObject()->setT(t);
            return jsi::Value::undefined();
        }

        JSI_HOST_FUNCTION(setB) {
            auto b = arguments[0].asNumber();
            getObject()->setB(b);
            return jsi::Value::undefined();
        }

        JSI_EXPORT_FUNCTIONS(
            JSI_EXPORT_FUNC(JsiSkSGRect, setL),
            JSI_EXPORT_FUNC(JsiSkSGRect, setR),
            JSI_EXPORT_FUNC(JsiSkSGRect, setT),
            JSI_EXPORT_FUNC(JsiSkSGRect, setB),
            JSI_EXPORT_FUNC(JsiSkSGRect, to)
        )

        static sk_sp<sksg::Draw> fromValue(jsi::Runtime &runtime,
                                           const jsi::Value &obj) {
            return obj.asObject(runtime)
                    .asHostObject<JsiSkSGDraw>(runtime)
                    ->getObject();
        }
    };

} // namespace RNSkia