#pragma once

#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkPicture.h"
#include "JsiSkFont.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkPaint.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class DrawingCtx {
public:
  SkCanvas *_canvas;
  std::stack<SkPaint> _stack;

  DrawingCtx(SkCanvas *canvas) : _canvas(canvas) {
    _stack.push(SkPaint());
  }

  void save() {
    _stack.push(_stack.top());
  }

  SkPaint& getPaint() {
    return _stack.top();
  }

  void restore() {
    _stack.pop();
  }

};

void drawGlyphs(DrawingCtx* ctx, jsi::Runtime& runtime, const jsi::Object& node) {
    auto font = node.getProperty(runtime, "props")
         .asObject(runtime)
         .getProperty(runtime, "font").asObject(runtime).asHostObject<JsiSkFont>(runtime)->getObject();
   

   auto arr = node.getProperty(runtime, "props")
        .asObject(runtime)
        .getProperty(runtime, "glyphs")
        .asObject(runtime).asArray(runtime);
   auto x = node.getProperty(runtime, "props")
        .asObject(runtime)
        .getProperty(runtime, "x")
        .asNumber();
   auto y = node.getProperty(runtime, "props")
        .asObject(runtime)
        .getProperty(runtime, "y")
        .asNumber();
    auto color = node.getProperty(runtime, "props")
         .asObject(runtime)
         .getProperty(runtime, "color");
    auto opacity = 1;
//    if (node.getProperty(runtime, "props")
//        .asObject(runtime)
//        .getProperty(runtime, "opacity").isNumber()) {
//        opacity = node.getProperty(runtime, "props")
//            .asObject(runtime)
//            .getProperty(runtime, "opacity")
//            .asNumber();
//        
//    }
    std::vector<SkGlyphID> glyphIds;
    std::vector<SkPoint> positions;

    auto size = arr.size(runtime);
    glyphIds.reserve(size);
    positions.reserve(size);

    for (size_t i = 0; i < size; ++i) {
      auto obj = arr.getValueAtIndex(runtime, i).asObject(runtime);
        auto x = 0;
        auto y = 0;
        auto pos = SkPoint::Make(x, y);
      auto identifier =
          static_cast<SkGlyphID>(obj.getProperty(runtime, "id").asNumber());
      positions.push_back(pos);
      glyphIds.push_back(identifier);
    }
    ctx->save();
    SkPaint paint;
    paint.setColor(SK_ColorGREEN);
    paint.setAlphaf(opacity);
    auto pos = SkPoint::Make(x, y);
    ctx->_canvas->drawGlyphs(glyphIds.size(), glyphIds.data(), positions.data(),
                             pos, *font, paint);
    
    ctx->restore();
    
}

void draw(DrawingCtx* ctx, jsi::Runtime& runtime, const jsi::Object& node) {
  auto type = node.getProperty(runtime, "type").asString(runtime).utf8(runtime);

  if (type == "skFill") {
    ctx->_canvas->drawPaint(ctx->getPaint());
  } else if (type == "skGlyphs") {
    drawGlyphs(ctx, runtime, node);
  }
      auto children = node.getProperty(runtime, "children").asObject(runtime).asArray(runtime);
      auto size = children.size(runtime);
      for (size_t i = 0; i < size; i++) {
        auto element = children.getValueAtIndex(runtime, i).asObject(runtime);
        draw(ctx, runtime, element);
      }
}

class JsiDraw {
public:
  static const jsi::HostFunctionType
  createCtor(std::shared_ptr<RNSkPlatformContext> context) {
    return JSI_HOST_FUNCTION_LAMBDA {
      SkPictureRecorder recorder;
      SkRect rect = SkRect::Make(SkISize::Make(2'000'000, 2'000'000));
      SkCanvas *pictureCanvas = recorder.beginRecording(rect);
      DrawingCtx ctx(pictureCanvas);
      auto root = arguments[0].asObject(runtime).asArray(runtime);
      auto size = root.size(runtime);
      for (size_t i = 0; i < size; i++) {
        auto element = root.getValueAtIndex(runtime, i).asObject(runtime);
        draw(&ctx, runtime, element);
      }

      sk_sp<SkPicture> picture = recorder.finishRecordingAsPicture();
      // Return the newly constructed object
      return jsi::Object::createFromHostObject(
          runtime, std::make_shared<JsiSkPicture>(std::move(context),
                                                  std::move(picture)));
    };
  }
};
} // namespace RNSkia
