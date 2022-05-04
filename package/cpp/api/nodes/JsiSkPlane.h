#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include <JsiSkHostObjects.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "modules/sksg/include/SkSGPlane.h"
#include <values/RNSkReadonlyValue.h>

#pragma clang diagnostic pop

namespace RNSkia {

    using namespace facebook;

    class JsiSkPlane: public JsiSkWrappingSkPtrHostObject<sksg::Plane> {
    public:

        JsiSkPlane(std::shared_ptr<RNSkPlatformContext> context, sk_sp<sksg::Plane> node)
                : JsiSkWrappingSkPtrHostObject<sksg::Plane>(
                context, std::move(node)) {};

        JSI_PROPERTY_GET(__typename__) {
                return jsi::String::createFromUtf8(runtime, "Plane");
        }

        JSI_EXPORT_PROPERTY_GETTERS(JSI_EXPORT_PROP_GET(JsiSkRenderNode, __typename__))

        static sk_sp<sksg::Plane> fromValue(jsi::Runtime &runtime,
                                                 const jsi::Value &obj) {
            return obj.asObject(runtime)
                    .asHostObject<JsiSkPlane>(runtime)
                    ->getObject();
        }
    };

} // namespace RNSkia