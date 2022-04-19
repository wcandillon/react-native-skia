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
                runtime, std::make_shared<JsiSkNode>(getContext(), std::make_shared<NodeCanvas>()));
        }

        JSI_HOST_FUNCTION(MakeCircle) {
            auto props = arguments[0].getObject(runtime);
            auto r = props.getProperty(runtime, "r").asNumber();
            auto cx = props.getProperty(runtime, "cx").asNumber();
            auto cy = props.getProperty(runtime, "cy").asNumber();
            auto paint = JsiSkPaint::fromValue(runtime, props.getProperty(runtime, "paint"));
            return jsi::Object::createFromHostObject(
                    runtime, std::make_shared<JsiSkNode>(getContext(), std::make_shared<NodeCircle>(cx, cy, r, *paint)));
        }

        JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiSkNodeFactory, MakeCanvas), JSI_EXPORT_FUNC(JsiSkNodeFactory, MakeCircle))

        JsiSkNodeFactory(std::shared_ptr<RNSkPlatformContext> context)
                : JsiSkHostObject(std::move(context)) {}
    };

} // namespace RNSkia
