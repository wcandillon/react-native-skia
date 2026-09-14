import type { SharedValue } from "react-native-reanimated";

import { NodeType } from "../../dom/types";
import type {
  BlurMaskFilterProps,
  CircleProps,
  CTMProps,
  ImageProps,
  PaintProps,
  PointsProps,
  PathProps,
  RectProps,
  RoundedRectProps,
  OvalProps,
  LineProps,
  PatchProps,
  VerticesProps,
  DiffRectProps,
  TextProps,
  TextPathProps,
  TextBlobProps,
  GlyphsProps,
  PictureProps,
  ImageSVGProps,
  ParagraphProps,
  AtlasProps,
  BoxProps,
  BoxShadowProps,
  SkottieProps,
  DrawingNodeProps,
} from "../../dom/types";
import type { AnimatedProps } from "../../renderer";
import { isSharedValue, isSharedValueSelector } from "../utils";
import { isColorFilter, isImageFilter, isPathEffect, isShader } from "../Node";
import type { SkPaint, SkPicture, BaseRecorder } from "../../skia/types";

import { CommandType } from "./Core";
import type { Command } from "./Core";

export interface Recording {
  commands: Command[];
  paintPool: SkPaint[];
  // Last picture produced from this recording. The view keeps its own
  // reference to the picture it displays, so the renderer owns this one and
  // disposes it when the next frame replaces it or the recording is disposed.
  lastPicture?: SkPicture | null;
}

export const disposeRecording = (recording: Recording) => {
  "worklet";
  recording.paintPool.forEach((paint) => paint.dispose());
  recording.paintPool.length = 0;
  if (recording.lastPicture) {
    recording.lastPicture.dispose();
    recording.lastPicture = null;
  }
};

interface AnimationValues {
  animationValues: Set<SharedValue<unknown>>;
}

export class Recorder implements BaseRecorder {
  commands: Command[] = [];
  cursors: Command[][] = [];
  animationValues: Set<SharedValue<unknown>> = new Set();

  constructor() {
    this.cursors.push(this.commands);
  }

  getRecording(): Recording & AnimationValues {
    return {
      commands: this.commands,
      paintPool: [],
      animationValues: this.animationValues,
    };
  }

  private processProps(props: Record<string, unknown>) {
    const animatedProps: Record<string, unknown> = {};
    let hasAnimatedProps = false;

    for (const key in props) {
      const prop = props[key];
      if (isSharedValue(prop)) {
        this.animationValues.add(prop);
        animatedProps[key] = prop;
        hasAnimatedProps = true;
      } else if (isSharedValueSelector(prop)) {
        this.animationValues.add(prop.__sv);
        animatedProps[key] = prop;
        hasAnimatedProps = true;
      }
    }

    return {
      props,
      animatedProps: hasAnimatedProps ? animatedProps : undefined,
    };
  }

  private add(command: Command) {
    if (command.props) {
      const { animatedProps } = this.processProps(
        command.props as Record<string, unknown>
      );
      if (animatedProps) {
        command.animatedProps = animatedProps;
      }
    }
    this.cursors[this.cursors.length - 1].push(command);
  }

  saveGroup(props?: AnimatedProps<Pick<DrawingNodeProps, "zIndex">>) {
    const children: Command[] = [];
    const group: Command = { type: CommandType.Group, children };
    if (props) {
      group.props = props;
    }
    this.add(group);
    this.cursors.push(children);
  }

  restoreGroup() {
    this.cursors.pop();
  }

  savePaint(props: AnimatedProps<PaintProps>, standalone: boolean) {
    this.add({ type: CommandType.SavePaint, props, standalone });
  }

  restorePaint() {
    this.add({ type: CommandType.RestorePaint });
  }

  restorePaintDeclaration() {
    this.add({ type: CommandType.RestorePaintDeclaration });
  }

  materializePaint() {
    this.add({ type: CommandType.MaterializePaint });
  }

  pushPathEffect(pathEffectType: NodeType, props: AnimatedProps<unknown>) {
    if (!isPathEffect(pathEffectType)) {
      throw new Error("Invalid color filter type: " + pathEffectType);
    }
    this.add({
      type: CommandType.PushPathEffect,
      pathEffectType,
      props,
    });
  }

  pushImageFilter(imageFilterType: NodeType, props: AnimatedProps<unknown>) {
    if (!isImageFilter(imageFilterType)) {
      throw new Error("Invalid color filter type: " + imageFilterType);
    }
    this.add({
      type: CommandType.PushImageFilter,
      imageFilterType,
      props,
    });
  }

  pushColorFilter(colorFilterType: NodeType, props: AnimatedProps<unknown>) {
    if (!isColorFilter(colorFilterType)) {
      throw new Error("Invalid color filter type: " + colorFilterType);
    }
    this.add({
      type: CommandType.PushColorFilter,
      colorFilterType,
      props,
    });
  }

  pushShader(
    shaderType: NodeType,
    props: AnimatedProps<unknown>,
    children: number
  ) {
    if (!isShader(shaderType) && !(shaderType === NodeType.Blend)) {
      throw new Error("Invalid color filter type: " + shaderType);
    }
    this.add({ type: CommandType.PushShader, shaderType, props, children });
  }

  pushBlurMaskFilter(props: AnimatedProps<BlurMaskFilterProps>) {
    this.add({ type: CommandType.PushBlurMaskFilter, props });
  }

  composePathEffect() {
    this.add({ type: CommandType.ComposePathEffect });
  }

  composeColorFilter() {
    this.add({ type: CommandType.ComposeColorFilter });
  }

  composeImageFilter() {
    this.add({ type: CommandType.ComposeImageFilter });
  }

  saveCTM(props: AnimatedProps<CTMProps>) {
    this.add({ type: CommandType.SaveCTM, props });
  }

  restoreCTM() {
    this.add({ type: CommandType.RestoreCTM });
  }

  drawPaint() {
    this.add({ type: CommandType.DrawPaint });
  }

  saveLayer() {
    this.add({ type: CommandType.SaveLayer });
  }

  saveBackdropFilter() {
    this.add({ type: CommandType.SaveBackdropFilter });
  }

  drawBox(
    boxProps: AnimatedProps<BoxProps>,
    shadows: {
      props: BoxShadowProps;
      animatedProps?: Record<string, unknown>;
    }[]
  ) {
    shadows.forEach((shadow) => {
      if (shadow.props) {
        if (shadow.props) {
          const { animatedProps } = this.processProps(
            shadow.props as unknown as Record<string, unknown>
          );
          if (animatedProps) {
            shadow.animatedProps = animatedProps;
          }
        }
      }
    });
    this.add({ type: CommandType.DrawBox, props: boxProps, shadows });
  }

  drawImage(props: AnimatedProps<ImageProps>) {
    this.add({ type: CommandType.DrawImage, props });
  }

  drawCircle(props: AnimatedProps<CircleProps>) {
    this.add({ type: CommandType.DrawCircle, props });
  }
  drawPoints(props: AnimatedProps<PointsProps>) {
    this.add({ type: CommandType.DrawPoints, props });
  }

  drawPath(props: AnimatedProps<PathProps>) {
    this.add({ type: CommandType.DrawPath, props });
  }

  drawRect(props: AnimatedProps<RectProps>) {
    this.add({ type: CommandType.DrawRect, props });
  }

  drawRRect(props: AnimatedProps<RoundedRectProps>) {
    this.add({ type: CommandType.DrawRRect, props });
  }

  drawOval(props: AnimatedProps<OvalProps>) {
    this.add({ type: CommandType.DrawOval, props });
  }

  drawLine(props: AnimatedProps<LineProps>) {
    this.add({ type: CommandType.DrawLine, props });
  }

  drawPatch(props: AnimatedProps<PatchProps>) {
    this.add({ type: CommandType.DrawPatch, props });
  }

  drawVertices(props: AnimatedProps<VerticesProps>) {
    this.add({ type: CommandType.DrawVertices, props });
  }

  drawDiffRect(props: AnimatedProps<DiffRectProps>) {
    this.add({ type: CommandType.DrawDiffRect, props });
  }

  drawText(props: AnimatedProps<TextProps>) {
    this.add({ type: CommandType.DrawText, props });
  }

  drawTextPath(props: AnimatedProps<TextPathProps>) {
    this.add({ type: CommandType.DrawTextPath, props });
  }

  drawTextBlob(props: AnimatedProps<TextBlobProps>) {
    this.add({ type: CommandType.DrawTextBlob, props });
  }

  drawGlyphs(props: AnimatedProps<GlyphsProps>) {
    this.add({ type: CommandType.DrawGlyphs, props });
  }

  drawPicture(props: AnimatedProps<PictureProps>) {
    this.add({ type: CommandType.DrawPicture, props });
  }

  drawImageSVG(props: AnimatedProps<ImageSVGProps>) {
    this.add({ type: CommandType.DrawImageSVG, props });
  }

  drawParagraph(props: AnimatedProps<ParagraphProps>) {
    this.add({ type: CommandType.DrawParagraph, props });
  }

  drawAtlas(props: AnimatedProps<AtlasProps>) {
    this.add({ type: CommandType.DrawAtlas, props });
  }

  drawSkottie(props: AnimatedProps<SkottieProps>) {
    this.add({ type: CommandType.DrawSkottie, props });
  }
}
