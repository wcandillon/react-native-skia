#pragma once

#include <optional>
#include <string>
#include <variant>

#include "Command.h"
#include "Convertor.h"
#include "DrawingCtx.h"

namespace RNSkia {

struct TransformProps {
  std::optional<SkM44> transform;
  std::optional<SkPoint> origin;
  std::optional<SkMatrix> matrix;
};

// TODO: can we avoid a copy here?
SkMatrix processTransform(std::optional<SkMatrix> &matrix,
                          std::optional<SkM44> &transform,
                          std::optional<SkPoint> &origin) {
  SkMatrix m3;
  if (matrix.has_value()) {
    m3 = matrix.value();
    if (origin.has_value()) {
      m3.postTranslate(origin.value().x(), origin.value().y());
      m3.preTranslate(-origin.value().x(), -origin.value().y());
    }
  } else if (transform.has_value()) {
    auto m4 = transform.value();
    if (origin.has_value()) {
      m4.postTranslate(origin.value().x(), origin.value().y());
      m4.preTranslate(-origin.value().x(), -origin.value().y());
    }
    m3 = m4.asM33();
  }
  return m3;
}

struct CTMCmdProps : TransformProps {
  std::optional<ClipDef> clip;
  std::optional<bool> invertClip;
  std::optional<Layer> layer;
};

class SaveCTMCmd : public Command {
private:
  CTMCmdProps props;

public:
  SaveCTMCmd(jsi::Runtime &runtime, const jsi::Object &object,
             Variables &variables)
      : Command(CommandType::SaveCTM) {
    convertProperty(runtime, object, "transform", props.transform, variables);
    convertProperty(runtime, object, "origin", props.origin, variables);
    convertProperty(runtime, object, "matrix", props.matrix, variables);
    convertProperty(runtime, object, "clip", props.clip, variables);
    convertProperty(runtime, object, "invertClip", props.invertClip, variables);
    convertProperty(runtime, object, "layer", props.layer, variables);
  }

  void saveCTM(DrawingCtx *ctx) {
    auto clip = props.clip;
    auto invertClip = props.invertClip;
    auto layer = props.layer;
    auto hasTransform = props.matrix.has_value() || props.transform.has_value();
    auto hasClip = clip.has_value();
    auto op = invertClip.has_value() && invertClip.value()
                  ? SkClipOp::kDifference
                  : SkClipOp::kIntersect;
    auto shouldSave = hasTransform || hasClip || layer.has_value();
    SkMatrix m3 = processTransform(props.matrix, props.transform, props.origin);
    if (shouldSave) {
      if (layer.has_value()) {
        if (std::holds_alternative<bool>(layer.value())) {
          ctx->canvas->saveLayer(nullptr, nullptr);
        } else {
          auto paint = std::get<SkPaint>(layer.value());
          ctx->canvas->saveLayer(nullptr, &paint);
        }
      } else {
        ctx->canvas->save();
      }
      ctx->canvas->concat(m3);
    }
    if (clip.has_value()) {
      auto c = clip.value();
      if (std::holds_alternative<SkPath>(c)) {
        auto path = std::get<SkPath>(c);
        ctx->canvas->clipPath(path, op);
      } else if (std::holds_alternative<std::string>(c)) {
        auto pathString = std::get<std::string>(c);
        SkPath result;
        if (SkParsePath::FromSVGString(pathString.c_str(), &result)) {
          ctx->canvas->clipPath(result, op);
        } else {
          throw std::runtime_error("Could not parse path from string.");
        }
      } else if (std::holds_alternative<SkRect>(c)) {
        auto rect = std::get<SkRect>(c);
        ctx->canvas->clipRect(rect, op);
      } else if (std::holds_alternative<SkRRect>(c)) {
        auto rrect = std::get<SkRRect>(c);
        ctx->canvas->clipRRect(rrect, op);
      }
    }
  }
};

struct PaintCmdProps {
  std::optional<SkColor> color;
  std::optional<SkBlendMode> blendMode;
  std::optional<SkPaint::Style> style;
  std::optional<SkPaint::Join> strokeJoin;
  std::optional<SkPaint::Cap> strokeCap;
  std::optional<float> strokeMiter;
  std::optional<float> strokeWidth;
  std::optional<float> opacity;
  std::optional<bool> antiAlias;
  std::optional<bool> dither;
  std::optional<SkPaint> paint;
};

class SavePaintCmd : public Command {
private:
  PaintCmdProps props;

public:
  SavePaintCmd(jsi::Runtime &runtime, const jsi::Object &object,
               Variables &variables)
      : Command(CommandType::SavePaint) {
    convertProperty(runtime, object, "color", props.color, variables);
    convertProperty(runtime, object, "blendMode", props.blendMode, variables);
    convertProperty(runtime, object, "style", props.style, variables);
    convertProperty(runtime, object, "strokeJoin", props.strokeJoin, variables);
    convertProperty(runtime, object, "strokeCap", props.strokeCap, variables);
    convertProperty(runtime, object, "strokeMiter", props.strokeMiter,
                    variables);
    convertProperty(runtime, object, "strokeWidth", props.strokeWidth,
                    variables);
    convertProperty(runtime, object, "opacity", props.opacity, variables);
    convertProperty(runtime, object, "antiAlias", props.antiAlias, variables);
    convertProperty(runtime, object, "dither", props.dither, variables);
    convertProperty(runtime, object, "paint", props.paint, variables);
  }

  void savePaint(DrawingCtx *ctx) {
    if (props.paint.has_value()) {
      ctx->pushPaint(props.paint.value());
      return;
    }
    ctx->savePaint();
    auto &paint = ctx->getPaint();
    if (props.opacity.has_value()) {
      paint.setAlphaf(paint.getAlphaf() * props.opacity.value());
    }
    if (props.color.has_value()) {
      auto currentOpacity = paint.getAlphaf();
      paint.setShader(nullptr);
      auto cl = SkColor4f::FromColor(props.color.value());
      paint.setColor(cl);
      paint.setAlphaf(currentOpacity * paint.getAlphaf());
    }
    if (props.blendMode.has_value()) {
      paint.setBlendMode(props.blendMode.value());
    }
    if (props.style.has_value()) {
      paint.setStyle(props.style.value());
    }
    if (props.strokeJoin.has_value()) {
      paint.setStrokeJoin(props.strokeJoin.value());
    }
    if (props.strokeCap.has_value()) {
      paint.setStrokeCap(props.strokeCap.value());
    }
    if (props.strokeMiter.has_value()) {
      paint.setStrokeMiter(props.strokeMiter.value());
    }
    if (props.strokeWidth.has_value()) {
      paint.setStrokeWidth(props.strokeWidth.value());
    }
    if (props.antiAlias.has_value()) {
      paint.setAntiAlias(props.antiAlias.value());
    }
    if (props.dither.has_value()) {
      paint.setDither(props.dither.value());
    }
  }
};

} // namespace RNSkia
