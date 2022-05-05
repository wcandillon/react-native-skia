#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include <JsiSkHostObjects.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "modules/sksg/include/SkSGDraw.h"
#include <values/RNSkReadonlyValue.h>

#pragma clang diagnostic pop

namespace RNSkia {

    using namespace facebook;

    class JsiSkSGDraw: public JsiSkWrappingSkPtrHostObject<sksg::Draw> {
    public:

        JsiSkSGDraw(std::shared_ptr<RNSkPlatformContext> context, sk_sp<sksg::Draw> node)
                : JsiSkWrappingSkPtrHostObject<sksg::Draw>(
                context, std::move(node)) {};

        JSI_PROPERTY_GET(__typename__) {
            return jsi::String::createFromUtf8(runtime, "Draw");
        }

        JSI_EXPORT_PROPERTY_GETTERS(JSI_EXPORT_PROP_GET(JsiSkSGDraw, __typename__))

        static sk_sp<sksg::Draw> fromValue(jsi::Runtime &runtime,
                                            const jsi::Value &obj) {
            return obj.asObject(runtime)
                    .asHostObject<JsiSkSGDraw>(runtime)
                    ->getObject();
        }
    };

} // namespace RNSkia