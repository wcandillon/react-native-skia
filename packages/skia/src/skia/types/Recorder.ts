import type { SharedValue } from "react-native-reanimated";

import type {
  TextProps,
  AtlasProps,
  BlurMaskFilterProps,
  BoxProps,
  BoxShadowProps,
  CircleProps,
  CTMProps,
  DiffRectProps,
  GlyphsProps,
  ImageProps,
  ImageSVGProps,
  LineProps,
  NodeType,
  OvalProps,
  PaintProps,
  ParagraphProps,
  PatchProps,
  PathProps,
  PictureProps,
  PointsProps,
  RectProps,
  RoundedRectProps,
  TextBlobProps,
  TextPathProps,
  VerticesProps,
  SkottieProps,
  DrawingNodeProps,
} from "../../dom/types";
import type { AnimatedProps } from "../../renderer/processors/Animations/Animations";

import type { SkPicture } from "./Picture";

export interface BaseRecorder {
  saveGroup(props?: AnimatedProps<Pick<DrawingNodeProps, "zIndex">>): void;
  restoreGroup(): void;
  savePaint(props: AnimatedProps<PaintProps>, standalone: boolean): void;
  restorePaint(): void;
  restorePaintDeclaration(): void;
  materializePaint(): void;
  pushPathEffect(pathEffectType: NodeType, props: AnimatedProps<unknown>): void;
  pushImageFilter(
    imageFilterType: NodeType,
    props: AnimatedProps<unknown>
  ): void;
  pushColorFilter(
    colorFilterType: NodeType,
    props: AnimatedProps<unknown>
  ): void;
  pushShader(
    shaderType: NodeType,
    props: AnimatedProps<unknown>,
    children: number
  ): void;
  pushBlurMaskFilter(props: AnimatedProps<BlurMaskFilterProps>): void;
  composePathEffect(): void;
  composeColorFilter(): void;
  composeImageFilter(): void;
  saveCTM(props: AnimatedProps<CTMProps>): void;
  restoreCTM(): void;
  drawPaint(): void;
  saveLayer(): void;
  saveBackdropFilter(): void;
  drawBox(
    boxProps: AnimatedProps<BoxProps>,
    shadows: {
      props: BoxShadowProps;
      animatedProps?: Record<string, SharedValue<unknown>>;
    }[]
  ): void;
  drawImage(props: AnimatedProps<ImageProps>): void;
  drawCircle(props: AnimatedProps<CircleProps>): void;
  drawPoints(props: AnimatedProps<PointsProps>): void;
  drawPath(props: AnimatedProps<PathProps>): void;
  drawRect(props: AnimatedProps<RectProps>): void;
  drawRRect(props: AnimatedProps<RoundedRectProps>): void;
  drawOval(props: AnimatedProps<OvalProps>): void;
  drawLine(props: AnimatedProps<LineProps>): void;
  drawPatch(props: AnimatedProps<PatchProps>): void;
  drawVertices(props: AnimatedProps<VerticesProps>): void;
  drawDiffRect(props: AnimatedProps<DiffRectProps>): void;
  drawText(props: AnimatedProps<TextProps>): void;
  drawTextPath(props: AnimatedProps<TextPathProps>): void;
  drawTextBlob(props: AnimatedProps<TextBlobProps>): void;
  drawGlyphs(props: AnimatedProps<GlyphsProps>): void;
  drawPicture(props: AnimatedProps<PictureProps>): void;
  drawImageSVG(props: AnimatedProps<ImageSVGProps>): void;
  drawParagraph(props: AnimatedProps<ParagraphProps>): void;
  drawSkottie(props: AnimatedProps<SkottieProps>): void;
  drawAtlas(props: AnimatedProps<AtlasProps>): void;
}

export interface JsiRecorder extends BaseRecorder {
  play(picture: SkPicture): void;
  applyUpdates(variables: SharedValue<unknown>[]): void;
  reset(): void;
  /**
   * Unique id of the native recording, used to tag the updates sent to the
   * view that owns it.
   */
  getId(): number;
  /**
   * Releases the wrapper's reference to the native recorder. A recording
   * that a view owns stays alive until the view replaces it or is torn down.
   */
  dispose(): void;
}
