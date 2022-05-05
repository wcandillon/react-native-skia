#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkHostObjects.h"
#include "nodes/JsiSkRenderNode.h"
#include "nodes/JsiSkScene.h"
#include "nodes/JsiSkPlane.h"
#include "nodes/JsiSkSGPaintNode.h"
#include "nodes/JsiSkSGDraw.h"
#include "nodes/JsiSkSGRect.h"
#include "nodes/JsiSkSGGeometryNode.h"
#include "nodes/JsiSkSGGroup.h"
#include "nodes/JsiSkSGOpacityEffect.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include <SkStream.h>
#include <sksg/include/SkSGGeometryEffect.h>
#include <sksg/include/SkSGOpacityEffect.h>

#pragma clang diagnostic pop

namespace RNSkia {

    using namespace facebook;

    class JsiSkNodeFactory : public JsiSkHostObject {
    public:
        JSI_HOST_FUNCTION(MakeScene) {
            auto root = JsiSkSGGroup::fromValue(runtime, arguments[0]);
            return jsi::Object::createFromHostObject(
                runtime, std::make_shared<JsiSkScene>(getContext(), sksg::Scene::Make(std::move(root))));
        }

        // Paint Nodes
        JSI_HOST_FUNCTION(MakeColor) {
            auto color = arguments[0].asNumber();
            return jsi::Object::createFromHostObject(
                    runtime, std::make_shared<JsiSkSGColor>(getContext(), sksg::Color::Make(std::move(color))));
        }

//        JSI_HOST_FUNCTION(MakeBlurMaskFilter) {
//            int blurStyle = arguments[0].asNumber();
//            float sigma = arguments[1].asNumber();
//            bool respectCTM = arguments[2].getBool();
//            auto mf = SkMaskFilter::MakeBlur((SkBlurStyle)blurStyle, sigma, respectCTM);
//            return jsi::Object::createFromHostObject(
//                    runtime, std::make_shared<JsiSkSGMaskFilter>(getContext(), MaskFilter::Make(std::move(mf))));
//        }

        // Geometry Nodes
        JSI_HOST_FUNCTION(MakePlane) {
            return jsi::Object::createFromHostObject(
                    runtime, std::make_shared<JsiSkSGGeometryNode>(getContext(), sksg::Plane::Make()));
        }

        JSI_HOST_FUNCTION(MakeRect) {
            auto rect = JsiSkRect::fromValue(runtime, arguments[0]);
            return jsi::Object::createFromHostObject(
                    runtime, std::make_shared<JsiSkSGRect>(getContext(), sksg::Rect::Make(std::move(*rect))));
        }

        // Render Nodes
        JSI_HOST_FUNCTION(MakeDraw) {
            auto render = JsiSkSGGeometryNode::fromValue(runtime, arguments[0]);
            auto paint = JsiSkSGPaintNode::fromValue(runtime, arguments[1]);
            return jsi::Object::createFromHostObject(
                   runtime, std::make_shared<JsiSkRenderNode>(getContext(), sksg::Draw::Make(std::move(render), std::move(paint))));
        }

        JSI_HOST_FUNCTION(MakeGroup) {
            return jsi::Object::createFromHostObject(
                    runtime, std::make_shared<JsiSkSGGroup>(getContext(), sksg::Group::Make()));
        }

        JSI_HOST_FUNCTION(MakeOpacityEffect) {
            auto child = JsiSkRenderNode::fromValue(runtime, arguments[0]);
            auto opacity = arguments[1].asNumber();
            return jsi::Object::createFromHostObject(
                    runtime, std::make_shared<JsiSkSGOpacityEffect>(getContext(), sksg::OpacityEffect::Make(std::move(child), opacity)));
        }

        JSI_EXPORT_FUNCTIONS(
            JSI_EXPORT_FUNC(JsiSkNodeFactory, MakeScene),
            JSI_EXPORT_FUNC(JsiSkNodeFactory, MakePlane),
            JSI_EXPORT_FUNC(JsiSkNodeFactory, MakeColor),
            JSI_EXPORT_FUNC(JsiSkNodeFactory, MakeDraw),
            JSI_EXPORT_FUNC(JsiSkNodeFactory, MakeRect),
            JSI_EXPORT_FUNC(JsiSkNodeFactory, MakeGroup),
            JSI_EXPORT_FUNC(JsiSkNodeFactory, MakeOpacityEffect),
        )

        JsiSkNodeFactory(std::shared_ptr<RNSkPlatformContext> context)
                : JsiSkHostObject(std::move(context)) {}
    };

} // namespace RNSkia