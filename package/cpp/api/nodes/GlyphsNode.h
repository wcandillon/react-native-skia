#pragma once

#include "Node.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"
#pragma clang diagnostic pop

namespace RNSkia {

    using namespace facebook;


    class GlyphsNode: public Node {
    public:
        GlyphsNode(jsi::Runtime &runtime, jsi::Object &props): Node(runtime, props) {}

        std::string name() {
            return "GlyphsNode";
        }

        void render(SkCanvas* canvas, SkPaint& parentPaint) {
            auto jsiGlyphs = materialize("glyphs").asObject(runtime).asArray(runtime);
            auto font = JsiSkFont::fromValue(runtime, props.getProperty(runtime, "font"));
            auto x = materialize("x").asNumber();
            auto y = materialize("y").asNumber();
            auto paint = processPaint(parentPaint);
            SkPoint origin = SkPoint::Make(x, y);

            std::vector<SkPoint> positions;
            std::vector<SkGlyphID> glyphs;

            int glyphsSize = static_cast<int>(jsiGlyphs.size(runtime));
            positions.reserve(glyphsSize);
            glyphs.reserve(glyphsSize);
            for (int i = 0; i < glyphsSize; i++) {
                auto id = jsiGlyphs.getValueAtIndex(runtime, i).asObject(runtime).getProperty(runtime, "id").asNumber();
                std::shared_ptr<SkPoint> point = JsiSkPoint::fromValue(
                        runtime, jsiGlyphs.getValueAtIndex(runtime, i).asObject(runtime).getProperty(runtime, "pos"));
                positions.push_back(*point.get());
                glyphs.push_back(id);
            }

            canvas->drawGlyphs(
                glyphsSize,
                glyphs.data(),
                positions.data(),
                origin,
                *font,
                paint
            );
        }
    };
} // namespace RNSkia
