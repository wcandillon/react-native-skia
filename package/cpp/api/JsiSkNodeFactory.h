#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkHostObjects.h"
#include "JsiSkNode.h"
#include "nodes/CanvasNode.h"
#include "nodes/CircleNode.h"
#include "nodes/FillNode.h"
#include "nodes/BlurMaskNode.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include <SkStream.h>

#pragma clang diagnostic pop

namespace RNSkia {

    using namespace facebook;

    class JsiSkNodeFactory : public JsiSkHostObject {
    public:
        JSI_HOST_FUNCTION(MakeCanvas) {
            auto props = arguments[0].getObject(runtime);
            return jsi::Object::createFromHostObject(
                runtime, std::make_shared<JsiSkNode>(getContext(), std::make_shared<CanvasNode>(runtime, props)));
        }

        JSI_HOST_FUNCTION(MakeCircle) {
            auto props = arguments[0].getObject(runtime);
            return jsi::Object::createFromHostObject(
                    runtime, std::make_shared<JsiSkNode>(getContext(), std::make_shared<CircleNode>(runtime, props)));
        }

        JSI_HOST_FUNCTION(MakeFill) {
            auto props = arguments[0].getObject(runtime);
            return jsi::Object::createFromHostObject(
                    runtime, std::make_shared<JsiSkNode>(getContext(), std::make_shared<FillNode>(runtime, props)));
        }

        JSI_HOST_FUNCTION(MakeBlurMask) {
            auto props = arguments[0].getObject(runtime);
            return jsi::Object::createFromHostObject(
                    runtime, std::make_shared<JsiSkNode>(getContext(), std::make_shared<BlurMaskNode>(runtime, props)));
        }

        JSI_EXPORT_FUNCTIONS(
            JSI_EXPORT_FUNC(JsiSkNodeFactory, MakeCanvas),
            JSI_EXPORT_FUNC(JsiSkNodeFactory, MakeCircle),
            JSI_EXPORT_FUNC(JsiSkNodeFactory, MakeFill),
            JSI_EXPORT_FUNC(JsiSkNodeFactory, MakeBlurMask)
        )

        JsiSkNodeFactory(std::shared_ptr<RNSkPlatformContext> context)
                : JsiSkHostObject(std::move(context)) {}
    };

} // namespace RNSkia
