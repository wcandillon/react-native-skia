#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include <JsiSkHostObjects.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"


#include "modules/sksg/include/SkSGScene.h"
#include <values/RNSkReadonlyValue.h>

#pragma clang diagnostic pop

namespace RNSkia {

    using namespace facebook;

    class JsiSkScene: public JsiSkWrappingUniquePtrHostObject<sksg::Scene> {
    public:

        JsiSkScene(std::shared_ptr<RNSkPlatformContext> context, std::unique_ptr<sksg::Scene> scene)
                : JsiSkWrappingUniquePtrHostObject<sksg::Scene>(
                context, std::move(scene)){};

        JSI_PROPERTY_GET(__typename__) {
                return jsi::String::createFromUtf8(runtime, "Scene");
        }

        JSI_EXPORT_PROPERTY_GETTERS(JSI_EXPORT_PROP_GET(JsiSkScene, __typename__))


//        JSI_EXPORT_FUNCTIONS(
//          JSI_EXPORT_FUNC(JsiSkNode, setProps)
//        )

        static std::unique_ptr<sksg::Scene> fromValue(jsi::Runtime &runtime,
                                                 const jsi::Value &obj) {
            return std::move(obj.asObject(runtime)
                    .asHostObject<JsiSkScene>(runtime)
                    ->getObject());
        }
    };

} // namespace RNSkia