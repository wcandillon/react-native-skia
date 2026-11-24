#pragma once

#include <memory>
#include <optional>
#include <stdexcept>
#include <string>
#include <vector>

#include "DrawingCtx.h"

namespace RNSkia {

enum CommandType {
  // Context
  Group,
  SavePaint,
  RestorePaint,
  SaveCTM,
  RestoreCTM,
  PushColorFilter,
  PushBlurMaskFilter,
  PushImageFilter,
  PushPathEffect,
  PushShader,
  ComposeColorFilter,
  ComposeImageFilter,
  ComposePathEffect,
  MaterializePaint,
  SaveBackdropFilter,
  SaveLayer,
  RestorePaintDeclaration,
  // Drawing: from here on, every command draws with the current paint (see
  // isDrawingCommand).
  DrawBox,
  DrawImage,
  DrawCircle,
  DrawPaint,
  DrawPoints,
  DrawPath,
  DrawRect,
  DrawRRect,
  DrawOval,
  DrawLine,
  DrawPatch,
  DrawVertices,
  DrawDiffRect,
  DrawText,
  DrawTextPath,
  DrawTextBlob,
  DrawGlyphs,
  DrawPicture,
  DrawImageSVG,
  DrawParagraph,
  DrawAtlas,
  DrawSkottie
};

inline bool isDrawingCommand(CommandType type) {
  return type >= CommandType::DrawBox;
}

/**
 * A recorded command. The context commands without properties (restore,
 * compose, materialize, the layers) and DrawPaint are plain instances of this
 * class and play through their type; every command with properties is a
 * subclass that overrides play().
 */
class Command {
public:
  const CommandType type;

  explicit Command(CommandType t) : type(t) {}
  virtual ~Command() = default;

  /**
   * Applies the command to the drawing context. A context command pushes its
   * effect, paint or CTM; a drawing command draws with the current paint, and
   * the recorder plays it once per paint declared on the node.
   */
  virtual void play(DrawingCtx *ctx) {
    switch (type) {
    case CommandType::RestorePaint:
      ctx->restorePaint();
      break;
    case CommandType::RestoreCTM:
      ctx->canvas->restore();
      break;
    case CommandType::ComposeColorFilter:
      ctx->composeColorFilter();
      break;
    case CommandType::ComposeImageFilter:
      ctx->composeImageFilter();
      break;
    case CommandType::ComposePathEffect:
      ctx->composePathEffect();
      break;
    case CommandType::MaterializePaint:
      ctx->materializePaint();
      break;
    case CommandType::RestorePaintDeclaration: {
      ctx->materializePaint();
      auto paint = ctx->restorePaint();
      ctx->paintDeclarations.push_back(paint);
      break;
    }
    case CommandType::SaveBackdropFilter:
      ctx->saveBackdropFilter();
      break;
    case CommandType::SaveLayer: {
      ctx->materializePaint();
      // A <Layer> draws through the paint declared on it (its <Paint> child),
      // or without one when it has none.
      const SkPaint *paint = nullptr;
      SkPaint layerPaint;
      if (!ctx->paintDeclarations.empty()) {
        layerPaint = ctx->paintDeclarations.back();
        ctx->paintDeclarations.pop_back();
        paint = &layerPaint;
      }
      ctx->canvas->saveLayer(
          SkCanvas::SaveLayerRec(nullptr, paint, nullptr, 0));
      break;
    }
    case CommandType::DrawPaint:
      ctx->canvas->drawPaint(ctx->getPaint());
      break;
    default:
      throw std::runtime_error("Command " + std::to_string(type) +
                               " cannot play itself");
    }
  }
};

/** Played by the recorder, which sorts the children on their z-index. */
class GroupCommand : public Command {
public:
  std::optional<float> zIndex;
  std::vector<std::unique_ptr<Command>> children;

  GroupCommand() : Command(CommandType::Group) {}
};

} // namespace RNSkia
