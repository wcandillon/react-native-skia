#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkHostObjects.h"
#include "JsiSkSG.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include <SkStream.h>
#include <modules/sksg/include/SkSGGroup.h>

#pragma clang diagnostic pop

namespace RNSkia {

    using namespace facebook;

    class JsiSkSGFactory : public JsiSkHostObject {
    public:
        JSI_HOST_FUNCTION(Group) {
            return jsi::Object::createFromHostObject(
                runtime, std::make_shared<JsiSkSGGroup>(getContext(), sksg::Group::Make()));
        }

        JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiSkSGFactory, Group))

        JsiSkSGFactory(std::shared_ptr<RNSkPlatformContext> context)
                : JsiSkHostObject(std::move(context)) {}
    };

} // namespace RNSkia
