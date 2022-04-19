#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include <JsiSkHostObjects.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include <modules/svg/include/SkSVGDOM.h>

#pragma clang diagnostic pop

namespace RNSkia {

    using namespace facebook;

    class NodeCanvas {
    public:
        NodeCanvas() {}

        void render(SkCanvas* canvas) {
            auto paint = std::make_shared<SkPaint>();
            paint->setColor(SK_ColorCYAN);
            canvas->drawPaint(*paint);
        }
    };

    class JsiSkNodeCanvas : public JsiSkWrappingSharedPtrHostObject<NodeCanvas> {
    public:

        JsiSkNodeCanvas(std::shared_ptr<RNSkPlatformContext> context)
        : JsiSkWrappingSharedPtrHostObject<NodeCanvas>(
                context, std::make_shared<NodeCanvas>()){};

        JSI_PROPERTY_GET(__typename__) {
          return jsi::String::createFromUtf8(runtime, "NodeCanvas");
        }

        JSI_EXPORT_PROPERTY_GETTERS(JSI_EXPORT_PROP_GET(JsiSkNodeCanvas, __typename__))

        /**
          Returns the underlying object from a host object of this type
         */
        static std::shared_ptr<NodeCanvas> fromValue(jsi::Runtime &runtime,
                                         const jsi::Value &obj) {
            return obj.asObject(runtime)
                    .asHostObject<JsiSkNodeCanvas>(runtime)
                    ->getObject();
        }
    };

} // namespace RNSkia
