#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include <JsiSkHostObjects.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "modules/sksg/include/SkSGPaint.h"
#include <values/RNSkReadonlyValue.h>

#pragma clang diagnostic pop

namespace RNSkia {

    using namespace facebook;

    class JsiSkSGColor: public JsiSkWrappingSkPtrHostObject<sksg::Color> {
    public:

        JsiSkSGColor(std::shared_ptr<RNSkPlatformContext> context, sk_sp<sksg::Color> node)
                : JsiSkWrappingSkPtrHostObject<sksg::Color>(
                context, std::move(node)) {};

        JSI_PROPERTY_GET(__typename__) {
                return jsi::String::createFromUtf8(runtime, "Color");
        }

        JSI_EXPORT_PROPERTY_GETTERS(JSI_EXPORT_PROP_GET(JsiSkRenderNode, __typename__))

        static sk_sp<sksg::Color> fromValue(jsi::Runtime &runtime,
                                            const jsi::Value &obj) {
            return obj.asObject(runtime)
                    .asHostObject<JsiSkSGColor>(runtime)
                    ->getObject();
        }
    };

} // namespace RNSkia