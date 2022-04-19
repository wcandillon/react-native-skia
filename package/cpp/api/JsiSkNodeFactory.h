#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkHostObjects.h"
#include "JsiSkNode.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include <SkStream.h>

#pragma clang diagnostic pop

namespace RNSkia {

    using namespace facebook;

    class JsiSkNodeFactory : public JsiSkHostObject {
    public:
        JSI_HOST_FUNCTION(MakeCanvas) {
            return jsi::Object::createFromHostObject(
                runtime, std::make_shared<JsiSkNodeCanvas>(getContext()));
        }

        JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiSkNodeFactory, MakeCanvas))

        JsiSkNodeFactory(std::shared_ptr<RNSkPlatformContext> context)
                : JsiSkHostObject(std::move(context)) {}
    };

} // namespace RNSkia
