#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include <JsiSkHostObjects.h>

#include <SkMaskFilter.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "modules/sksg/include/SkSGPaint.h"
#include "modules/sksg/include/SkSGNode.h"
#include "nodes/MaskFilter.h"

#include <values/RNSkReadonlyValue.h>

#pragma clang diagnostic pop

namespace RNSkia {

    using namespace facebook;

    class JsiSkSGPaintNode: public JsiSkWrappingSkPtrHostObject<sksg::PaintNode> {
    public:

        JsiSkSGPaintNode(std::shared_ptr<RNSkPlatformContext> context, sk_sp<sksg::PaintNode> node)
                : JsiSkWrappingSkPtrHostObject<sksg::PaintNode>(
                context, std::move(node)) {};

        JSI_PROPERTY_GET(__typename__) {
                return jsi::String::createFromUtf8(runtime, "PaintNode");
        }

        JSI_EXPORT_PROPERTY_GETTERS(JSI_EXPORT_PROP_GET(JsiSkSGPaintNode, __typename__))

        static sk_sp<sksg::PaintNode> fromValue(jsi::Runtime &runtime,
                                            const jsi::Value &obj) {
            return obj.asObject(runtime)
                    .asHostObject<JsiSkSGPaintNode>(runtime)
                    ->getObject();
        }
    };

    class JsiSkSGColor: public JsiSkWrappingSkPtrHostObject<sksg::Color> {
    public:

        JsiSkSGColor(std::shared_ptr<RNSkPlatformContext> context, sk_sp<sksg::Color> node)
                : JsiSkWrappingSkPtrHostObject<sksg::Color>(
                context, std::move(node)) {};

        JSI_PROPERTY_GET(__typename__) {
            return jsi::String::createFromUtf8(runtime, "Color");
        }

        JSI_EXPORT_PROPERTY_GETTERS(JSI_EXPORT_PROP_GET(JsiSkSGColor, __typename__))

        JSI_HOST_FUNCTION(to) {
            // TODO: std::move?
            return jsi::Object::createFromHostObject(
                    runtime, std::make_shared<JsiSkSGPaintNode>(getContext(), getObject()));
        }

        JSI_HOST_FUNCTION(setColor) {
            auto o = arguments[0].asNumber();
            getObject()->setColor(o);
            return jsi::Value::undefined();
        }

        JSI_EXPORT_FUNCTIONS(
                JSI_EXPORT_FUNC(JsiSkSGColor, setColor),
                JSI_EXPORT_FUNC(JsiSkSGColor, to),
        )

        static sk_sp<sksg::Color> fromValue(jsi::Runtime &runtime,
                                            const jsi::Value &obj) {
            return obj.asObject(runtime)
                    .asHostObject<JsiSkSGColor>(runtime)
                    ->getObject();
        }
    };

    class JsiSkSGMaskFilter: public JsiSkWrappingSkPtrHostObject<MaskFilter> {
    public:

        JsiSkSGMaskFilter(std::shared_ptr<RNSkPlatformContext> context, sk_sp<MaskFilter> node)
                : JsiSkWrappingSkPtrHostObject<MaskFilter>(
                context, std::move(node)) {};

        JSI_PROPERTY_GET(__typename__) {
            return jsi::String::createFromUtf8(runtime, "MaskFilter");
        }

        JSI_EXPORT_PROPERTY_GETTERS(JSI_EXPORT_PROP_GET(JsiSkSGMaskFilter, __typename__))

        JSI_HOST_FUNCTION(to) {
            // TODO: std::move?
            return jsi::Object::createFromHostObject(
                    runtime, std::make_shared<JsiSkSGPaintNode>(getContext(), getObject()));
        }

        JSI_EXPORT_FUNCTIONS(
            JSI_EXPORT_FUNC(JsiSkSGMaskFilter, to),
        )

        static sk_sp<MaskFilter> fromValue(jsi::Runtime &runtime,
                                            const jsi::Value &obj) {
            return obj.asObject(runtime)
                    .asHostObject<JsiSkSGMaskFilter>(runtime)
                    ->getObject();
        }
    };
} // namespace RNSkia