import type { SharedValue } from "react-native-reanimated";

import type { BaseRecorder, JsiRecorder, Skia } from "../../skia/types";
import type {
  PaintProps,
  NodeType,
  BlurMaskFilterProps,
  CTMProps,
  BoxProps,
  BoxShadowProps,
  ImageProps,
  CircleProps,
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
  SkottieProps,
  DrawingNodeProps,
} from "../../dom/types";
import type { AnimatedProps } from "../../renderer";
import { isSharedValue, isSharedValueSelector } from "../utils";

/**
 * Currently the recorder only work if the GPU resources (e.g Images) are owned by the main thread.
 * It will crash otherwise on Ganesh (iOS/Android).
 */
export class ReanimatedRecorder implements BaseRecorder {
  private values = new Set<SharedValue<unknown>>();
  private recorder: JsiRecorder;

  constructor(Skia: Skia) {
    this.recorder = Skia.Recorder();
  }

  reset() {
    this.values.clear();
    this.recorder.reset();
  }

  private processAnimationValues(props?: Record<string, unknown>) {
    if (!props) {
      return;
    }
    Object.values(props).forEach((value) => {
      if (isSharedValueSelector(value) && !this.values.has(value.__sv)) {
        const sv = value.__sv;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        sv.name = `variable${this.values.size}`;
        this.values.add(sv as SharedValue<unknown>);
        return;
      }

      if (isSharedValue(value) && !this.values.has(value)) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        value.name = `variable${this.values.size}`;
        this.values.add(value as SharedValue<unknown>);
      }
    });
  }

  getRecorder() {
    return this.recorder;
  }

  getSharedValues() {
    return Array.from(this.values);
  }

  saveGroup(props?: AnimatedProps<Pick<DrawingNodeProps, "zIndex">>): void {
    if (props) {
      this.processAnimationValues(props);
      this.recorder.saveGroup(props);
    } else {
      this.recorder.saveGroup();
    }
  }

  restoreGroup(): void {
    this.recorder.restoreGroup();
  }

  savePaint(props: AnimatedProps<PaintProps>, standalone: boolean): void {
    this.processAnimationValues(props);
    this.recorder.savePaint(props, standalone);
  }

  restorePaint(): void {
    this.recorder.restorePaint();
  }

  restorePaintDeclaration(): void {
    this.recorder.restorePaintDeclaration();
  }

  materializePaint(): void {
    this.recorder.materializePaint();
  }

  pushPathEffect(
    pathEffectType: NodeType,
    props: AnimatedProps<unknown>
  ): void {
    this.processAnimationValues(props);
    this.recorder.pushPathEffect(pathEffectType, props);
  }

  pushImageFilter(
    imageFilterType: NodeType,
    props: AnimatedProps<unknown>
  ): void {
    this.processAnimationValues(props);
    this.recorder.pushImageFilter(imageFilterType, props);
  }

  pushColorFilter(
    colorFilterType: NodeType,
    props: AnimatedProps<unknown>
  ): void {
    this.processAnimationValues(props);
    this.recorder.pushColorFilter(colorFilterType, props);
  }

  pushShader(
    shaderType: NodeType,
    props: AnimatedProps<unknown>,
    children: number
  ): void {
    this.processAnimationValues(props);
    this.recorder.pushShader(shaderType, props, children);
  }

  pushBlurMaskFilter(props: AnimatedProps<BlurMaskFilterProps>): void {
    this.processAnimationValues(props);
    this.recorder.pushBlurMaskFilter(props);
  }

  composePathEffect(): void {
    this.recorder.composePathEffect();
  }

  composeColorFilter(): void {
    this.recorder.composeColorFilter();
  }

  composeImageFilter(): void {
    this.recorder.composeImageFilter();
  }

  saveCTM(props: AnimatedProps<CTMProps>): void {
    this.processAnimationValues(props);
    this.recorder.saveCTM(props);
  }

  restoreCTM(): void {
    this.recorder.restoreCTM();
  }

  drawPaint(): void {
    this.recorder.drawPaint();
  }

  saveLayer(): void {
    this.recorder.saveLayer();
  }

  saveBackdropFilter(): void {
    this.recorder.saveBackdropFilter();
  }

  drawBox(
    boxProps: AnimatedProps<BoxProps>,
    shadows: {
      props: BoxShadowProps;
    }[]
  ): void {
    this.processAnimationValues(boxProps);
    shadows.forEach((shadow) => {
      this.processAnimationValues(
        shadow.props as AnimatedProps<BoxShadowProps>
      );
    });
    this.recorder.drawBox(
      boxProps,
      // TODO: Fix this type BaseRecorder.drawBox()
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      shadows.map((s) => s.props)
    );
  }

  drawImage(props: AnimatedProps<ImageProps>): void {
    this.processAnimationValues(props);
    this.recorder.drawImage(props);
  }

  drawCircle(props: AnimatedProps<CircleProps>): void {
    this.processAnimationValues(props);
    this.recorder.drawCircle(props);
  }

  drawPoints(props: AnimatedProps<PointsProps>): void {
    this.processAnimationValues(props);
    this.recorder.drawPoints(props);
  }

  drawPath(props: AnimatedProps<PathProps>): void {
    this.processAnimationValues(props);
    this.recorder.drawPath(props);
  }

  drawRect(props: AnimatedProps<RectProps>): void {
    this.processAnimationValues(props);
    this.recorder.drawRect(props);
  }

  drawRRect(props: AnimatedProps<RoundedRectProps>): void {
    this.processAnimationValues(props);
    this.recorder.drawRRect(props);
  }

  drawOval(props: AnimatedProps<OvalProps>): void {
    this.processAnimationValues(props);
    this.recorder.drawOval(props);
  }

  drawLine(props: AnimatedProps<LineProps>): void {
    this.processAnimationValues(props);
    this.recorder.drawLine(props);
  }

  drawPatch(props: AnimatedProps<PatchProps>): void {
    this.processAnimationValues(props);
    this.recorder.drawPatch(props);
  }

  drawVertices(props: AnimatedProps<VerticesProps>): void {
    this.processAnimationValues(props);
    this.recorder.drawVertices(props);
  }

  drawDiffRect(props: AnimatedProps<DiffRectProps>): void {
    this.processAnimationValues(props);
    this.recorder.drawDiffRect(props);
  }

  drawText(props: AnimatedProps<TextProps>): void {
    this.processAnimationValues(props);
    this.recorder.drawText(props);
  }

  drawTextPath(props: AnimatedProps<TextPathProps>): void {
    this.processAnimationValues(props);
    this.recorder.drawTextPath(props);
  }

  drawTextBlob(props: AnimatedProps<TextBlobProps>): void {
    this.processAnimationValues(props);
    this.recorder.drawTextBlob(props);
  }

  drawGlyphs(props: AnimatedProps<GlyphsProps>): void {
    this.processAnimationValues(props);
    this.recorder.drawGlyphs(props);
  }

  drawPicture(props: AnimatedProps<PictureProps>): void {
    this.processAnimationValues(props);
    this.recorder.drawPicture(props);
  }

  drawImageSVG(props: AnimatedProps<ImageSVGProps>): void {
    this.processAnimationValues(props);
    this.recorder.drawImageSVG(props);
  }

  drawParagraph(props: AnimatedProps<ParagraphProps>): void {
    this.processAnimationValues(props);
    this.recorder.drawParagraph(props);
  }

  drawAtlas(props: AnimatedProps<AtlasProps>): void {
    this.processAnimationValues(props);
    this.recorder.drawAtlas(props);
  }

  drawSkottie(props: AnimatedProps<SkottieProps>): void {
    this.processAnimationValues(props);
    this.recorder.drawSkottie(props);
  }
}
