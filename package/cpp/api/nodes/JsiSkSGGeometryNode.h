#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include <JsiSkHostObjects.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "modules/sksg/include/SkSGGeometryNode.h"
#include <values/RNSkReadonlyValue.h>

#pragma clang diagnostic pop

namespace RNSkia {

    using namespace facebook;

    class JsiSkSGGeometryNode: public JsiSkWrappingSkPtrHostObject<sksg::GeometryNode> {
    public:

        JsiSkSGGeometryNode(std::shared_ptr<RNSkPlatformContext> context, sk_sp<sksg::GeometryNode> node)
                : JsiSkWrappingSkPtrHostObject<sksg::GeometryNode>(
                context, std::move(node)) {};

        JSI_PROPERTY_GET(__typename__) {
            return jsi::String::createFromUtf8(runtime, "GeometryNode");
        }

        JSI_EXPORT_PROPERTY_GETTERS(JSI_EXPORT_PROP_GET(JsiSkSGGeometryNode, __typename__))

        static sk_sp<sksg::GeometryNode> fromValue(jsi::Runtime &runtime,
                                                const jsi::Value &obj) {
            return obj.asObject(runtime)
                    .asHostObject<JsiSkSGGeometryNode>(runtime)
                    ->getObject();
        }
    };
} // namespace RNSkia