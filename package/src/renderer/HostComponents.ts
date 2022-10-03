import type { ForwardedRef } from "react";

import { NodeType } from "../dom/types";
import type {
  CircleProps,
  DrawingNodeProps,
  ImageProps,
  PaintProps,
  PathProps,
  CustomDrawingNodeProps,
  LineProps,
  OvalProps,
  DiffRectProps,
  PointsProps,
  RectProps,
  RoundedRectProps,
  TextProps,
  VerticesProps,
  BlurMaskFilterProps,
  BlendImageFilterProps,
  BlurImageFilterProps,
  DisplacementMapImageFilterProps,
  DropShadowImageFilterProps,
  OffsetImageFilterProps,
  RuntimeShaderImageFilterProps,
  MatrixColorFilterProps,
  ShaderProps,
  ImageShaderProps,
  LinearGradientProps,
  GroupProps,
  PatchProps,
  BlendColorFilterProps,
  DashPathEffectProps,
  DiscretePathEffectProps,
  CornerPathEffectProps,
  Line2DPathEffectProps,
  Path1DPathEffectProps,
  Path2DPathEffectProps,
  TextPathProps,
  TextBlobProps,
  GlyphsProps,
  TwoPointConicalGradientProps,
  TurbulenceProps,
  SweepGradientProps,
  RadialGradientProps,
  ColorProps,
  PictureProps,
  ImageSVGProps,
  LerpColorFilterProps,
  BoxProps,
  BoxShadowProps,
} from "../dom/types";
import type { ChildrenProps } from "../dom/types/Common";
import type {
  BlendProps,
  MorphologyImageFilterProps,
} from "../dom/types/ImageFilters";
import type { PaintNode } from "../dom/nodes/PaintNode";

import type { Container } from "./Container";
import { exhaustiveCheck } from "./typeddash";
import type { SkiaProps } from "./processors";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      skGroup: SkiaProps<GroupProps>;
      skPaint: SkiaProps<PaintProps> & { ref: ForwardedRef<PaintNode> };

      // Drawings
      skFill: SkiaProps<DrawingNodeProps>;
      skImage: SkiaProps<ImageProps>;
      skCircle: SkiaProps<CircleProps>;
      skPath: SkiaProps<PathProps>;
      skDrawing: SkiaProps<CustomDrawingNodeProps>;
      skLine: SkiaProps<LineProps>;
      skOval: SkiaProps<OvalProps>;
      skPatch: SkiaProps<PatchProps>;
      skPoints: SkiaProps<PointsProps>;
      skRect: SkiaProps<RectProps>;
      skRRect: SkiaProps<RoundedRectProps>;
      skVertices: SkiaProps<VerticesProps>;
      skText: SkiaProps<TextProps>;
      skTextPath: SkiaProps<TextPathProps>;
      skTextBlob: SkiaProps<TextBlobProps>;
      skGlyphs: SkiaProps<GlyphsProps>;
      skDiffRect: SkiaProps<DiffRectProps>;
      skPicture: SkiaProps<PictureProps>;
      skImageSVG: SkiaProps<ImageSVGProps>;

      // BlurMaskFilters
      skBlurMaskFilter: SkiaProps<BlurMaskFilterProps>;

      // ImageFilters
      skBlendImageFilter: SkiaProps<BlendImageFilterProps>;
      skBlurImageFilter: SkiaProps<BlurImageFilterProps>;
      skOffsetImageFilter: SkiaProps<OffsetImageFilterProps>;
      skDropShadowImageFilter: SkiaProps<DropShadowImageFilterProps>;
      skDisplacementMapImageFilter: SkiaProps<DisplacementMapImageFilterProps>;
      skRuntimeShaderImageFilter: SkiaProps<RuntimeShaderImageFilterProps>;
      skMorphologyImageFilter: SkiaProps<MorphologyImageFilterProps>;

      // ColorFilters
      skMatrixColorFilter: SkiaProps<MatrixColorFilterProps>;
      skBlendColorFilter: SkiaProps<BlendColorFilterProps>;
      skLinearToSRGBGammaColorFilter: SkiaProps<ChildrenProps>;
      skSRGBToLinearGammaColorFilter: SkiaProps<ChildrenProps>;
      skLumaColorFilter: SkiaProps<ChildrenProps>;
      skLerpColorFilter: SkiaProps<LerpColorFilterProps>;

      // Shaders
      skShader: SkiaProps<ShaderProps>;
      skImageShader: SkiaProps<ImageShaderProps>;
      skColorShader: SkiaProps<ColorProps>;
      skTurbulence: SkiaProps<TurbulenceProps>;
      skFractalNoise: SkiaProps<TurbulenceProps>;
      skLinearGradient: SkiaProps<LinearGradientProps>;
      skRadialGradient: SkiaProps<RadialGradientProps>;
      skSweepGradient: SkiaProps<SweepGradientProps>;
      skTwoPointConicalGradient: SkiaProps<TwoPointConicalGradientProps>;

      // Path Effects
      skDiscretePathEffect: SkiaProps<DiscretePathEffectProps>;
      skDashPathEffect: SkiaProps<DashPathEffectProps>;
      skPath1DPathEffect: SkiaProps<Path1DPathEffectProps>;
      skPath2DPathEffect: SkiaProps<Path2DPathEffectProps>;
      skCornerPathEffect: SkiaProps<CornerPathEffectProps>;
      skSumPathEffect: ChildrenProps;
      skLine2DPathEffect: SkiaProps<Line2DPathEffectProps>;

      // Mixed declarations/drawings
      skBlend: SkiaProps<BlendProps>;
      skBackdropFilter: SkiaProps<ChildrenProps>;
      skBox: SkiaProps<BoxProps>;
      skBoxShadow: SkiaProps<BoxShadowProps>;
    }
  }
}

export const createNode = (
  container: Container,
  type: NodeType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any
) => {
  const { Sk } = container;
  switch (type) {
    case NodeType.Group:
      return Sk.Group(props);
    case NodeType.Paint:
      return Sk.Paint(props);
    // Drawings
    case NodeType.Fill:
      return Sk.Fill(props);
    case NodeType.Image:
      return Sk.Image(props);
    case NodeType.Circle:
      return Sk.Circle(props);
    case NodeType.Path:
      return Sk.Path(props);
    case NodeType.Drawing:
      return Sk.CustomDrawing(props);
    case NodeType.Line:
      return Sk.Line(props);
    case NodeType.Oval:
      return Sk.Oval(props);
    case NodeType.Patch:
      return Sk.Patch(props);
    case NodeType.Points:
      return Sk.Points(props);
    case NodeType.Rect:
      return Sk.Rect(props);
    case NodeType.RRect:
      return Sk.RRect(props);
    case NodeType.Vertices:
      return Sk.Vertices(props);
    case NodeType.Text:
      return Sk.Text(props);
    case NodeType.TextPath:
      return Sk.TextPath(props);
    case NodeType.TextBlob:
      return Sk.TextBlob(props);
    case NodeType.Glyphs:
      return Sk.Glyphs(props);
    case NodeType.DiffRect:
      return Sk.DiffRect(props);
    case NodeType.Picture:
      return Sk.Picture(props);
    case NodeType.ImageSVG:
      return Sk.ImageSVG(props);
    // Mask Filter
    case NodeType.BlurMaskFilter:
      return Sk.BlurMaskFilter(props);
    // Image Filter
    case NodeType.BlendImageFilter:
      return Sk.BlendImageFilter(props);
    case NodeType.BlurImageFilter:
      return Sk.BlurImageFilter(props);
    case NodeType.OffsetImageFilter:
      return Sk.OffsetImageFilter(props);
    case NodeType.DropShadowImageFilter:
      return Sk.DropShadowImageFilter(props);
    case NodeType.DisplacementMapImageFilter:
      return Sk.DisplacementMapImageFilter(props);
    case NodeType.MorphologyImageFilter:
      return Sk.MorphologyImageFilter(props);
    case NodeType.RuntimeShaderImageFilter:
      return Sk.RuntimeShaderImageFilter(props);
    // Color Filter
    case NodeType.MatrixColorFilter:
      return Sk.MatrixColorFilter(props);
    case NodeType.BlendColorFilter:
      return Sk.BlendColorFilter(props);
    case NodeType.LerpColorFilter:
      return Sk.LerpColorFilter(props);
    case NodeType.LumaColorFilter:
      return Sk.LumaColorFilter();
    case NodeType.LinearToSRGBGammaColorFilter:
      return Sk.LinearToSRGBGammaColorFilter();
    case NodeType.SRGBToLinearGammaColorFilter:
      return Sk.SRGBToLinearGammaColorFilter();
    // Shader
    case NodeType.Shader:
      return Sk.Shader(props);
    case NodeType.ImageShader:
      return Sk.ImageShader(props);
    case NodeType.ColorShader:
      return Sk.ColorShader(props);
    case NodeType.Turbulence:
      return Sk.Turbulence(props);
    case NodeType.FractalNoise:
      return Sk.FractalNoise(props);
    case NodeType.LinearGradient:
      return Sk.LinearGradient(props);
    case NodeType.RadialGradient:
      return Sk.RadialGradient(props);
    case NodeType.SweepGradient:
      return Sk.SweepGradient(props);
    case NodeType.TwoPointConicalGradient:
      return Sk.TwoPointConicalGradient(props);
    // Path Effect
    case NodeType.CornerPathEffect:
      return Sk.CornerPathEffect(props);
    case NodeType.DiscretePathEffect:
      return Sk.DiscretePathEffect(props);
    case NodeType.DashPathEffect:
      return Sk.DashPathEffect(props);
    case NodeType.Path1DPathEffect:
      return Sk.Path1DPathEffect(props);
    case NodeType.Path2DPathEffect:
      return Sk.Path2DPathEffect(props);
    case NodeType.SumPathEffect:
      return Sk.SumPathEffect();
    case NodeType.Line2DPathEffect:
      return Sk.Line2DPathEffect(props);
    // Mixed
    case NodeType.Blend:
      return Sk.Blend(props);
    case NodeType.BackdropFilter:
      return Sk.BackdropFilter(props);
    case NodeType.Box:
      return Sk.Box(props);
    case NodeType.BoxShadow:
      return Sk.BoxShadow(props);
    default:
      return exhaustiveCheck(type);
  }
};
