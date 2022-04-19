#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include <JsiSkHostObjects.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include <modules/sksg/include/SkSGGroup.h>

#pragma clang diagnostic pop

namespace RNSkia {

    using namespace facebook;

    class JsiSkSG : public JsiSkWrappingSkPtrHostObject<SkSGGroup> {
    public:
        JsiSkSG(std::shared_ptr<RNSkPlatformContext> context, sk_sp<SkSGGroup> sggroup)
                : JsiSkWrappingSkPtrHostObject<SkSGGroup>(std::move(context), std::move(sggroup)){}

        JSI_PROPERTY_GET(__typename__) {
                return jsi::String::createFromUtf8(runtime, "SGGroup");
        }

        JSI_EXPORT_PROPERTY_GETTERS(JSI_EXPORT_PROP_GET(JsiSkSG, __typename__))

        /**
          Returns the underlying object from a host object of this type
         */
        static sk_sp<SkSGGroup> fromValue(jsi::Runtime &runtime,
                                         const jsi::Value &obj) {
            return obj.asObject(runtime)
                    .asHostObject<JsiSkSGGroup>(runtime)
                    ->getObject();
        }
    };

} // namespace RNSkia
