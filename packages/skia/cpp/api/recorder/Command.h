#pragma once

#include <memory>
#include <optional>
#include <vector>

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
  // Drawing
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

class Command {
public:
  CommandType type;
  std::string nodeType;

  explicit Command(CommandType t) : type(t) {}
  Command(CommandType t, std::string nodeT) : type(t), nodeType(nodeT) {}
  virtual ~Command() = default;
};

class GroupCommand : public Command {
public:
  std::optional<float> zIndex;
  std::vector<std::unique_ptr<Command>> children;

  GroupCommand() : Command(CommandType::Group) {}
};

} // namespace RNSkia
