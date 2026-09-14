#pragma once

#include <algorithm>
#include <cmath>
#include <memory>
#include <optional>
#include <string>
#include <vector>

#include <jsi/jsi.h>

#include "ColorFilters.h"
#include "Command.h"
#include "Convertor.h"
#include "DrawingCtx.h"
#include "Drawings.h"
#include "ImageFilters.h"
#include "Paint.h"
#include "PathEffects.h"
#include "Shaders.h"
#include "rnskia/RNSkPlatformContext.h"

namespace RNSkia {

class Recorder {
private:
  using CommandList = std::vector<std::unique_ptr<Command>>;

  struct PendingGroup {
    GroupCommand *group;
    float zIndex;
    int order;
  };

  CommandList commands;
  std::vector<CommandList *> commandStack;

  CommandList &currentCommands() { return *commandStack.back(); }

  void pushCommand(std::unique_ptr<Command> command) {
    currentCommands().push_back(std::move(command));
  }

  static float sanitizeZIndex(const GroupCommand *group) {
    if (!group || !group->zIndex.has_value()) {
      return 0.0f;
    }
    const auto value = group->zIndex.value();
    if (!std::isfinite(value)) {
      return 0.0f;
    }
    return value;
  }

  void flushPendingGroups(DrawingCtx *ctx,
                          std::vector<PendingGroup> &pendingGroups) {
    if (pendingGroups.empty()) {
      return;
    }
    std::sort(pendingGroups.begin(), pendingGroups.end(),
              [](const PendingGroup &a, const PendingGroup &b) {
                if (a.zIndex == b.zIndex) {
                  return a.order < b.order;
                }
                return a.zIndex < b.zIndex;
              });
    for (const auto &pending : pendingGroups) {
      playGroup(ctx, pending.group);
    }
    pendingGroups.clear();
  }

  void playGroup(DrawingCtx *ctx, GroupCommand *group) {
    if (group == nullptr) {
      return;
    }
    std::vector<PendingGroup> pending;
    for (const auto &child : group->children) {
      if (child->type == CommandType::Group) {
        auto *childGroup = static_cast<GroupCommand *>(child.get());
        pending.push_back({childGroup, sanitizeZIndex(childGroup),
                           static_cast<int>(pending.size())});
      } else {
        flushPendingGroups(ctx, pending);
        playCommand(ctx, child.get());
      }
    }
    flushPendingGroups(ctx, pending);
  }

  void playCommand(DrawingCtx *ctx, Command *cmd);

public:
  std::shared_ptr<RNSkPlatformContext> _context;
  Variables variables;

  Recorder() { commandStack.push_back(&commands); }
  ~Recorder() {
    if (!_context || commands.empty()) {
      return;
    }

    auto context = _context;
    auto pendingCommands = std::make_shared<CommandList>(std::move(commands));

    context->runOnMainThread(
        [pendingCommands = std::move(pendingCommands)]() mutable {
          // Destroy the recorded commands on the main thread to ensure GPU
          // backed resources release safely.
          pendingCommands->clear();
        });
  }

  void savePaint(jsi::Runtime &runtime, const jsi::Object &props,
                 bool standalone) {
    pushCommand(
        std::make_unique<SavePaintCmd>(runtime, props, variables, standalone));
  }

  void pushShader(jsi::Runtime &runtime, const std::string &nodeType,
                  const jsi::Object &props, int children) {
    if (nodeType == "skShader") {
      pushCommand(
          std::make_unique<PushShaderCmd>(runtime, props, variables, children));
    } else if (nodeType == "skImageShader") {
      pushCommand(
          std::make_unique<PushImageShaderCmd>(runtime, props, variables));
    } else if (nodeType == "skColorShader") {
      pushCommand(std::make_unique<ColorShaderCmd>(runtime, props, variables));
    } else if (nodeType == "skTurbulence") {
      pushCommand(std::make_unique<TurbulenceCmd>(runtime, props, variables));
    } else if (nodeType == "skFractalNoise") {
      pushCommand(std::make_unique<FractalNoiseCmd>(runtime, props, variables));
    } else if (nodeType == "skLinearGradient") {
      pushCommand(
          std::make_unique<LinearGradientCmd>(runtime, props, variables));
    } else if (nodeType == "skRadialGradient") {
      pushCommand(
          std::make_unique<RadialGradientCmd>(runtime, props, variables));
    } else if (nodeType == "skSweepGradient") {
      pushCommand(
          std::make_unique<SweepGradientCmd>(runtime, props, variables));
    } else if (nodeType == "skTwoPointConicalGradient") {
      pushCommand(std::make_unique<TwoPointConicalGradientCmd>(runtime, props,
                                                               variables));
      // TODO: should receive skBlendShader here
    } else if (nodeType == "skBlend") {
      pushCommand(std::make_unique<BlendShaderCmd>(runtime, props, variables));
    }
  }

  void pushPathEffect(jsi::Runtime &runtime, const std::string &nodeType,
                      const jsi::Object &props) {
    if (nodeType == "skDiscretePathEffect") {
      pushCommand(
          std::make_unique<DiscretePathEffectCmd>(runtime, props, variables));
    } else if (nodeType == "skDashPathEffect") {
      pushCommand(
          std::make_unique<DashPathEffectCmd>(runtime, props, variables));
    } else if (nodeType == "skPath1DPathEffect") {
      pushCommand(
          std::make_unique<Path1DPathEffectCmd>(runtime, props, variables));
    } else if (nodeType == "skPath2DPathEffect") {
      pushCommand(
          std::make_unique<Path2DPathEffectCmd>(runtime, props, variables));
    } else if (nodeType == "skCornerPathEffect") {
      pushCommand(
          std::make_unique<CornerPathEffectCmd>(runtime, props, variables));
    } else if (nodeType == "skSumPathEffect") {
      pushCommand(
          std::make_unique<SumPathEffectCmd>(runtime, props, variables));
    } else if (nodeType == "skLine2DPathEffect") {
      pushCommand(
          std::make_unique<Line2DPathEffectCmd>(runtime, props, variables));
    }
  }

  void pushColorFilter(jsi::Runtime &runtime, const std::string &nodeType,
                       const jsi::Object &props) {
    if (nodeType == "skMatrixColorFilter") {
      pushCommand(
          std::make_unique<MatrixColorFilterCmd>(runtime, props, variables));
    } else if (nodeType == "skBlendColorFilter") {
      pushCommand(
          std::make_unique<BlendColorFilterCmd>(runtime, props, variables));
    } else if (nodeType == "skLinearToSRGBGammaColorFilter") {
      pushCommand(std::make_unique<LinearToSRGBGammaColorFilterCmd>(
          runtime, props, variables));
    } else if (nodeType == "skSRGBToLinearGammaColorFilter") {
      pushCommand(std::make_unique<SRGBToLinearGammaColorFilterCmd>(
          runtime, props, variables));
    } else if (nodeType == "skLumaColorFilter") {
      pushCommand(
          std::make_unique<LumaColorFilterCmd>(runtime, props, variables));
    } else if (nodeType == "skLerpColorFilter") {
      pushCommand(
          std::make_unique<LerpColorFilterCmd>(runtime, props, variables));
    }
  }

  void pushImageFilter(jsi::Runtime &runtime, const std::string &nodeType,
                       const jsi::Object &props) {
    if (nodeType == "skOffsetImageFilter") {
      pushCommand(
          std::make_unique<OffsetImageFilterCmd>(runtime, props, variables));
    } else if (nodeType == "skDisplacementMapImageFilter") {
      pushCommand(std::make_unique<DisplacementMapImageFilterCmd>(
          runtime, props, variables));
    } else if (nodeType == "skBlurImageFilter") {
      pushCommand(
          std::make_unique<BlurImageFilterCmd>(runtime, props, variables));
    } else if (nodeType == "skDropShadowImageFilter") {
      pushCommand(std::make_unique<DropShadowImageFilterCmd>(runtime, props,
                                                             variables));
    } else if (nodeType == "skMorphologyImageFilter") {
      pushCommand(std::make_unique<MorphologyImageFilterCmd>(runtime, props,
                                                             variables));
    } else if (nodeType == "skBlendImageFilter") {
      pushCommand(
          std::make_unique<BlendImageFilterCmd>(runtime, props, variables));
    } else if (nodeType == "skRuntimeShaderImageFilter") {
      pushCommand(std::make_unique<RuntimeShaderImageFilterCmd>(runtime, props,
                                                                variables));
    } else if (nodeType == "skImageFilter") {
      pushCommand(std::make_unique<ImageFilterCmd>(runtime, props, variables));
    }
  }

  void composePathEffect() {
    pushCommand(std::make_unique<Command>(CommandType::ComposePathEffect));
  }

  void composeImageFilter() {
    pushCommand(std::make_unique<Command>(CommandType::ComposeImageFilter));
  }

  void composeColorFilter() {
    pushCommand(std::make_unique<Command>(CommandType::ComposeColorFilter));
  }

  void pushBlurMaskFilter(jsi::Runtime &runtime, const jsi::Object &props) {
    pushCommand(std::make_unique<BlurMaskFilterCmd>(runtime, props, variables));
  }

  void saveCTM(jsi::Runtime &runtime, const jsi::Object &props) {
    pushCommand(std::make_unique<SaveCTMCmd>(runtime, props, variables));
  }

  void restoreCTM() {
    pushCommand(std::make_unique<Command>(CommandType::RestoreCTM));
  }

  void restorePaint() {
    pushCommand(std::make_unique<Command>(CommandType::RestorePaint));
  }

  void drawRect(jsi::Runtime &runtime, const jsi::Object &props) {
    pushCommand(std::make_unique<RectCmd>(runtime, props, variables));
  }

  void drawCircle(jsi::Runtime &runtime, const jsi::Object &props) {
    pushCommand(std::make_unique<CircleCmd>(runtime, props, variables));
  }

  void drawLine(jsi::Runtime &runtime, const jsi::Object &props) {
    pushCommand(std::make_unique<LineCmd>(runtime, props, variables));
  }

  void drawTextPath(jsi::Runtime &runtime, const jsi::Object &props) {
    pushCommand(std::make_unique<TextPathCmd>(runtime, props, variables));
  }

  void drawText(jsi::Runtime &runtime, const jsi::Object &props) {
    pushCommand(std::make_unique<TextCmd>(runtime, props, variables));
  }

  void drawPath(jsi::Runtime &runtime, const jsi::Object &props) {
    pushCommand(std::make_unique<PathCmd>(runtime, props, variables));
  }

  void drawPaint() {
    pushCommand(std::make_unique<Command>(CommandType::DrawPaint));
  }

  void drawBox(jsi::Runtime &runtime, const jsi::Object &props,
               const jsi::Array &shadows) {
    pushCommand(std::make_unique<BoxCmd>(runtime, props, shadows, variables));
  }

  void drawImage(jsi::Runtime &runtime, const jsi::Object &props) {
    pushCommand(
        std::make_unique<ImageCmd>(_context, runtime, props, variables));
  }

  void drawPoints(jsi::Runtime &runtime, const jsi::Object &props) {
    pushCommand(std::make_unique<PointsCmd>(runtime, props, variables));
  }

  void drawRRect(jsi::Runtime &runtime, const jsi::Object &props) {
    pushCommand(std::make_unique<RRectCmd>(runtime, props, variables));
  }

  void drawOval(jsi::Runtime &runtime, const jsi::Object &props) {
    pushCommand(std::make_unique<OvalCmd>(runtime, props, variables));
  }

  void drawPatch(jsi::Runtime &runtime, const jsi::Object &props) {
    pushCommand(std::make_unique<PatchCmd>(runtime, props, variables));
  }

  void drawVertices(jsi::Runtime &runtime, const jsi::Object &props) {
    pushCommand(std::make_unique<VerticesCmd>(runtime, props, variables));
  }

  void drawDiffRect(jsi::Runtime &runtime, const jsi::Object &props) {
    pushCommand(std::make_unique<DiffRectCmd>(runtime, props, variables));
  }

  void drawTextBlob(jsi::Runtime &runtime, const jsi::Object &props) {
    pushCommand(std::make_unique<TextBlobCmd>(runtime, props, variables));
  }

  void drawGlyphs(jsi::Runtime &runtime, const jsi::Object &props) {
    pushCommand(std::make_unique<GlyphsCmd>(runtime, props, variables));
  }

  void drawPicture(jsi::Runtime &runtime, const jsi::Object &props) {
    pushCommand(
        std::make_unique<PictureCmd>(_context, runtime, props, variables));
  }

  void drawImageSVG(jsi::Runtime &runtime, const jsi::Object &props) {
    pushCommand(std::make_unique<ImageSVGCmd>(runtime, props, variables));
  }

  void drawParagraph(jsi::Runtime &runtime, const jsi::Object &props) {
    pushCommand(std::make_unique<ParagraphCmd>(runtime, props, variables));
  }

  void drawAtlas(jsi::Runtime &runtime, const jsi::Object &props) {
    pushCommand(
        std::make_unique<AtlasCmd>(_context, runtime, props, variables));
  }

  void drawSkottie(jsi::Runtime &runtime, const jsi::Object &props) {
    pushCommand(std::make_unique<SkottieCmd>(runtime, props, variables));
  }

  void materializePaint() {
    pushCommand(std::make_unique<Command>(CommandType::MaterializePaint));
  }

  void restorePaintDeclaration() {
    pushCommand(
        std::make_unique<Command>(CommandType::RestorePaintDeclaration));
  }

  void saveLayer() {
    pushCommand(std::make_unique<Command>(CommandType::SaveLayer));
  }

  void saveBackdropFilter() {
    pushCommand(std::make_unique<Command>(CommandType::SaveBackdropFilter));
  }

  void saveGroup(jsi::Runtime &runtime,
                 const jsi::Value *propsValue = nullptr) {
    auto group = std::make_unique<GroupCommand>();
    if (propsValue != nullptr && propsValue->isObject()) {
      auto object = propsValue->asObject(runtime);
      convertProperty(runtime, object, "zIndex", group->zIndex, variables);
    }
    auto *children = &group->children;
    pushCommand(std::move(group));
    commandStack.push_back(children);
  }

  void restoreGroup() {
    if (commandStack.size() > 1) {
      commandStack.pop_back();
    }
  }

  void play(DrawingCtx *ctx) {
    for (const auto &cmd : commands) {
      playCommand(ctx, cmd.get());
    }
  }
};

inline void Recorder::playCommand(DrawingCtx *ctx, Command *cmd) {
  switch (cmd->type) {
  case CommandType::Group: {
    auto *group = static_cast<GroupCommand *>(cmd);
    playGroup(ctx, group);
    break;
  }
  case CommandType::ComposeColorFilter: {
    ctx->composeColorFilter();
    break;
  }
  case CommandType::ComposeImageFilter: {
    ctx->composeImageFilter();
    break;
  }
  case CommandType::ComposePathEffect: {
    ctx->composePathEffect();
    break;
  }
  case CommandType::RestorePaintDeclaration: {
    ctx->materializePaint();
    auto paint = ctx->restorePaint();
    ctx->paintDeclarations.push_back(paint);
    break;
  }
  case CommandType::SaveBackdropFilter: {
    ctx->saveBackdropFilter();
    break;
  }
  case CommandType::SaveLayer: {
    ctx->materializePaint();
    auto paint = ctx->paintDeclarations.back();
    ctx->paintDeclarations.pop_back();
    ctx->canvas->saveLayer(SkCanvas::SaveLayerRec(nullptr, &paint, nullptr, 0));
    break;
  }
  case CommandType::MaterializePaint: {
    ctx->materializePaint();
    break;
  }
  case CommandType::SavePaint: {
    auto *savePaintCmd = static_cast<SavePaintCmd *>(cmd);
    savePaintCmd->savePaint(ctx);
    break;
  }
  case CommandType::PushShader: {
    auto nodeType = cmd->nodeType;
    if (nodeType == "skShader") {
      auto *pushShaderCmd = static_cast<PushShaderCmd *>(cmd);
      pushShaderCmd->pushShader(ctx);
    } else if (nodeType == "skImageShader") {
      auto *pushImageShaderCmd = static_cast<PushImageShaderCmd *>(cmd);
      pushImageShaderCmd->pushShader(ctx);
    } else if (nodeType == "skColorShader") {
      auto *colorShaderCmd = static_cast<ColorShaderCmd *>(cmd);
      colorShaderCmd->pushShader(ctx);
    } else if (nodeType == "skTurbulence") {
      auto *turbulenceCmd = static_cast<TurbulenceCmd *>(cmd);
      turbulenceCmd->pushShader(ctx);
    } else if (nodeType == "skFractalNoise") {
      auto *fractalNoiseCmd = static_cast<FractalNoiseCmd *>(cmd);
      fractalNoiseCmd->pushShader(ctx);
    } else if (nodeType == "skLinearGradient") {
      auto *linearGradientCmd = static_cast<LinearGradientCmd *>(cmd);
      linearGradientCmd->pushShader(ctx);
    } else if (nodeType == "skRadialGradient") {
      auto *radialGradientCmd = static_cast<RadialGradientCmd *>(cmd);
      radialGradientCmd->pushShader(ctx);
    } else if (nodeType == "skSweepGradient") {
      auto *sweepGradientCmd = static_cast<SweepGradientCmd *>(cmd);
      sweepGradientCmd->pushShader(ctx);
    } else if (nodeType == "skTwoPointConicalGradient") {
      auto *twoPointConicalGradientCmd =
          static_cast<TwoPointConicalGradientCmd *>(cmd);
      twoPointConicalGradientCmd->pushShader(ctx);
    } else if (nodeType == "skBlendShader") {
      auto *blendShaderCmd = static_cast<BlendShaderCmd *>(cmd);
      blendShaderCmd->pushShader(ctx);
    } else {
      throw std::runtime_error("Invalid shader type: " + nodeType);
    }
    break;
  }
  case CommandType::PushImageFilter: {
    auto nodeType = cmd->nodeType;
    if (nodeType == "skOffsetImageFilter") {
      auto *offsetCmd = static_cast<OffsetImageFilterCmd *>(cmd);
      offsetCmd->pushImageFilter(ctx);
    } else if (nodeType == "skDisplacementMapImageFilter") {
      auto *displacementCmd = static_cast<DisplacementMapImageFilterCmd *>(cmd);
      displacementCmd->pushImageFilter(ctx);
    } else if (nodeType == "skBlurImageFilter") {
      auto *blurCmd = static_cast<BlurImageFilterCmd *>(cmd);
      blurCmd->pushImageFilter(ctx);
    } else if (nodeType == "skDropShadowImageFilter") {
      auto *dropShadowCmd = static_cast<DropShadowImageFilterCmd *>(cmd);
      dropShadowCmd->pushImageFilter(ctx);
    } else if (nodeType == "skMorphologyImageFilter") {
      auto *morphologyCmd = static_cast<MorphologyImageFilterCmd *>(cmd);
      morphologyCmd->pushImageFilter(ctx);
    } else if (nodeType == "skBlendImageFilter") {
      auto *blendCmd = static_cast<BlendImageFilterCmd *>(cmd);
      blendCmd->pushImageFilter(ctx);
    } else if (nodeType == "skRuntimeShaderImageFilter") {
      auto *runtimeShaderCmd = static_cast<RuntimeShaderImageFilterCmd *>(cmd);
      runtimeShaderCmd->pushImageFilter(ctx);
    } else if (nodeType == "skImageFilter") {
      auto *imageFilterCmd = static_cast<ImageFilterCmd *>(cmd);
      imageFilterCmd->pushImageFilter(ctx);
    } else {
      throw std::runtime_error("Invalid image filter type: " + nodeType);
    }
    break;
  }
  case CommandType::PushPathEffect: {
    auto nodeType = cmd->nodeType;
    if (nodeType == "skDiscretePathEffect") {
      auto *discreteCmd = static_cast<DiscretePathEffectCmd *>(cmd);
      discreteCmd->pushPathEffect(ctx);
    } else if (nodeType == "skDashPathEffect") {
      auto *dashCmd = static_cast<DashPathEffectCmd *>(cmd);
      dashCmd->pushPathEffect(ctx);
    } else if (nodeType == "skPath1DPathEffect") {
      auto *path1DCmd = static_cast<Path1DPathEffectCmd *>(cmd);
      path1DCmd->pushPathEffect(ctx);
    } else if (nodeType == "skPath2DPathEffect") {
      auto *path2DCmd = static_cast<Path2DPathEffectCmd *>(cmd);
      path2DCmd->pushPathEffect(ctx);
    } else if (nodeType == "skCornerPathEffect") {
      auto *cornerCmd = static_cast<CornerPathEffectCmd *>(cmd);
      cornerCmd->pushPathEffect(ctx);
    } else if (nodeType == "skSumPathEffect") {
      auto *sumCmd = static_cast<SumPathEffectCmd *>(cmd);
      sumCmd->pushPathEffect(ctx);
    } else if (nodeType == "skLine2DPathEffect") {
      auto *line2DCmd = static_cast<Line2DPathEffectCmd *>(cmd);
      line2DCmd->pushPathEffect(ctx);
    } else {
      throw std::runtime_error("Invalid path effect type: " + nodeType);
    }
    break;
  }
  case CommandType::PushColorFilter: {
    auto nodeType = cmd->nodeType;
    if (nodeType == "skMatrixColorFilter") {
      auto *matrixCmd = static_cast<MatrixColorFilterCmd *>(cmd);
      matrixCmd->pushColorFilter(ctx);
    } else if (nodeType == "skBlendColorFilter") {
      auto *blendCmd = static_cast<BlendColorFilterCmd *>(cmd);
      blendCmd->pushColorFilter(ctx);
    } else if (nodeType == "skLinearToSRGBGammaColorFilter") {
      auto *linearToSRGBCmd =
          static_cast<LinearToSRGBGammaColorFilterCmd *>(cmd);
      linearToSRGBCmd->pushColorFilter(ctx);
    } else if (nodeType == "skSRGBToLinearGammaColorFilter") {
      auto *srgbToLinearCmd =
          static_cast<SRGBToLinearGammaColorFilterCmd *>(cmd);
      srgbToLinearCmd->pushColorFilter(ctx);
    } else if (nodeType == "skLumaColorFilter") {
      auto *lumaCmd = static_cast<LumaColorFilterCmd *>(cmd);
      lumaCmd->pushColorFilter(ctx);
    } else if (nodeType == "skLerpColorFilter") {
      auto *lerpCmd = static_cast<LerpColorFilterCmd *>(cmd);
      lerpCmd->pushColorFilter(ctx);
    } else {
      throw std::runtime_error("Invalid color filter type: " + nodeType);
    }
    break;
  }
  case CommandType::PushBlurMaskFilter: {
    auto *blurMaskFilterCmd = static_cast<BlurMaskFilterCmd *>(cmd);
    blurMaskFilterCmd->pushMaskFilter(ctx);
    break;
  }
  case CommandType::RestorePaint: {
    ctx->restorePaint();
    break;
  }
  case CommandType::SaveCTM: {
    auto *saveCTMCmd = static_cast<SaveCTMCmd *>(cmd);
    saveCTMCmd->saveCTM(ctx);
    break;
  }
  case CommandType::RestoreCTM: {
    ctx->canvas->restore();
    break;
  }
  default: {
    auto currentPaints = ctx->paintDeclarations;
    SkPaint paint(ctx->getPaint());
    paint.setAlphaf(paint.getAlphaf() * ctx->getOpacity());
    currentPaints.push_back(paint);
    ctx->paintDeclarations.clear();

    for (auto &layerPaint : currentPaints) {
      ctx->pushPaint(layerPaint);

      switch (cmd->type) {
      case CommandType::DrawPaint:
        ctx->canvas->drawPaint(layerPaint);
        break;
      case CommandType::DrawCircle: {
        auto *circleCmd = static_cast<CircleCmd *>(cmd);
        circleCmd->draw(ctx);
        break;
      }
      case CommandType::DrawPath: {
        auto *pathCmd = static_cast<PathCmd *>(cmd);
        pathCmd->draw(ctx);
        break;
      }
      case CommandType::DrawRect: {
        auto *rectCmd = static_cast<RectCmd *>(cmd);
        rectCmd->draw(ctx);
        break;
      }
      case CommandType::DrawLine: {
        auto *lineCmd = static_cast<LineCmd *>(cmd);
        lineCmd->draw(ctx);
        break;
      }
      case CommandType::DrawTextPath: {
        auto *textPathCmd = static_cast<TextPathCmd *>(cmd);
        textPathCmd->draw(ctx);
        break;
      }
      case CommandType::DrawText: {
        auto *textCmd = static_cast<TextCmd *>(cmd);
        textCmd->draw(ctx);
        break;
      }
      case CommandType::DrawBox: {
        auto *boxCmd = static_cast<BoxCmd *>(cmd);
        boxCmd->draw(ctx);
        break;
      }
      case CommandType::DrawImage: {
        auto *imageCmd = static_cast<ImageCmd *>(cmd);
        imageCmd->draw(ctx);
        break;
      }
      case CommandType::DrawPoints: {
        auto *pointsCmd = static_cast<PointsCmd *>(cmd);
        pointsCmd->draw(ctx);
        break;
      }
      case CommandType::DrawRRect: {
        auto *rRectCmd = static_cast<RRectCmd *>(cmd);
        rRectCmd->draw(ctx);
        break;
      }
      case CommandType::DrawOval: {
        auto *ovalCmd = static_cast<OvalCmd *>(cmd);
        ovalCmd->draw(ctx);
        break;
      }
      case CommandType::DrawPatch: {
        auto *patchCmd = static_cast<PatchCmd *>(cmd);
        patchCmd->draw(ctx);
        break;
      }
      case CommandType::DrawVertices: {
        auto *verticesCmd = static_cast<VerticesCmd *>(cmd);
        verticesCmd->draw(ctx);
        break;
      }
      case CommandType::DrawDiffRect: {
        auto *diffRectCmd = static_cast<DiffRectCmd *>(cmd);
        diffRectCmd->draw(ctx);
        break;
      }
      case CommandType::DrawTextBlob: {
        auto *textBlobCmd = static_cast<TextBlobCmd *>(cmd);
        textBlobCmd->draw(ctx);
        break;
      }
      case CommandType::DrawGlyphs: {
        auto *glyphsCmd = static_cast<GlyphsCmd *>(cmd);
        glyphsCmd->draw(ctx);
        break;
      }
      case CommandType::DrawPicture: {
        auto *pictureCmd = static_cast<PictureCmd *>(cmd);
        pictureCmd->draw(ctx);
        break;
      }
      case CommandType::DrawImageSVG: {
        auto *imageSVGCmd = static_cast<ImageSVGCmd *>(cmd);
        imageSVGCmd->draw(ctx);
        break;
      }
      case CommandType::DrawParagraph: {
        auto *paragraphCmd = static_cast<ParagraphCmd *>(cmd);
        paragraphCmd->draw(ctx);
        break;
      }
      case CommandType::DrawAtlas: {
        auto *atlasCmd = static_cast<AtlasCmd *>(cmd);
        atlasCmd->draw(ctx);
        break;
      }
      case CommandType::DrawSkottie: {
        auto *skottieCmd = static_cast<SkottieCmd *>(cmd);
        skottieCmd->draw(ctx);
        break;
      }
      default:
        break;
      }

      ctx->restorePaint();
    }
    break;
  }
  }
}

} // namespace RNSkia
