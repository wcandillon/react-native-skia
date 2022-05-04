#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkHostObjects.h"
#include "nodes/JsiSkRenderNode.h"
#include "nodes/JsiSkScene.h"
#include "nodes/JsiSkPlane.h"
#include "nodes/JsiSkSGColor.h"
#include "nodes/JsiSkSGDraw.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include <SkStream.h>

#pragma clang diagnostic pop

namespace RNSkia {

    using namespace facebook;

    class JsiSkNodeFactory : public JsiSkHostObject {
    public:
        JSI_HOST_FUNCTION(MakeScene) {
            auto root = JsiSkRenderNode::fromValue(runtime, arguments[0]);
            return jsi::Object::createFromHostObject(
                runtime, std::make_shared<JsiSkScene>(getContext(), sksg::Scene::Make(std::move(root))));
        }

        JSI_HOST_FUNCTION(MakePlane) {
            return jsi::Object::createFromHostObject(
                    runtime, std::make_shared<JsiSkPlane>(getContext(), sksg::Plane::Make()));
        }


        JSI_HOST_FUNCTION(MakeColor) {
            auto color = arguments[0].asNumber();
            return jsi::Object::createFromHostObject(
                    runtime, std::make_shared<JsiSkSGColor>(getContext(), sksg::Color::Make(color)));
        }

        JSI_HOST_FUNCTION(MakeDraw) {
            auto render = JsiSkPlane::fromValue(runtime, arguments[0]);
            auto paint = JsiSkSGColor::fromValue(runtime, arguments[0]);
            return jsi::Object::createFromHostObject(
                    runtime, std::make_shared<JsiSkSGDraw>(getContext(), sksg::Draw::Make(render, paint)));
        }

        JSI_EXPORT_FUNCTIONS(
            JSI_EXPORT_FUNC(JsiSkNodeFactory, MakeScene),
            JSI_EXPORT_FUNC(JsiSkNodeFactory, MakePlane),
            JSI_EXPORT_FUNC(JsiSkNodeFactory, MakeColor),
        )

        JsiSkNodeFactory(std::shared_ptr<RNSkPlatformContext> context)
                : JsiSkHostObject(std::move(context)) {}
    };

} // namespace RNSkia